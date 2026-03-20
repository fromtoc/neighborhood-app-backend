package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Notification;
import com.example.app.entity.UserDeviceToken;
import com.example.app.entity.UserFollow;
import com.example.app.entity.UserNotificationSettings;
import com.example.app.mapper.*;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.SendResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 統一通知入口：
 * 1. 寫入 notification 收件匣（含 neighborhood_id，供前端導頁）
 * 2. 送 FCM push（依使用者關注里過濾）
 * 3. WebSocket 即時推送給已連線的使用者
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper              notificationMapper;
    private final UserNotificationSettingsMapper  settingsMapper;
    private final UserDeviceTokenMapper           deviceTokenMapper;
    private final NeighborhoodMapper              neighborhoodMapper;
    private final UserFollowMapper                userFollowMapper;
    private final SimpMessagingTemplate           ws;

    @Autowired(required = false)
    private FirebaseMessaging fcm;

    // ── 公開方法 ─────────────────────────────────────────────────────────

    /** 新貼文（非系統）— 通知關注該里的使用者 + 追蹤該作者的用戶（排除發文者） */
    @Async
    public void onNewPost(Long neighborhoodId, Long authorId, Long postId,
                          String title, String body) {
        // 1. 通知關注該里的使用者
        fanOut(neighborhoodId, "new_post", "new_post",
                title, body, "post", postId, authorId);
        // 2. 通知追蹤該作者的用戶（排除已在里通知中的）
        notifyFollowers(authorId, postId, title, body);
    }

    /** 通知追蹤該作者的用戶有新貼文 */
    private void notifyFollowers(Long authorId, Long postId, String title, String body) {
        List<UserFollow> followers = userFollowMapper.selectList(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getTargetId, authorId));
        for (UserFollow f : followers) {
            if (!isEnabled(f.getFollowerId(), "follow_post")) continue;
            insertNotification(f.getFollowerId(), "follow_post", title, body, "post", postId, null);
            pushWs(f.getFollowerId(), "follow_post", title, body, "post", postId);
        }
        List<Long> followerIds = followers.stream()
                .filter(f -> isEnabled(f.getFollowerId(), "follow_post"))
                .map(UserFollow::getFollowerId).toList();
        pushFcm(followerIds, title, body, "follow_post", "post", postId);
    }

    /** 新資訊（系統爬蟲）— 通知關注該里/區使用者 */
    @Async
    public void onNewInfo(Long neighborhoodId, String postType, Long postId,
                          String title, String body) {
        onNewInfo(neighborhoodId, postType, postId, title, body, "normal");
    }

    /**
     * 新資訊（含緊急程度）— urgency: "urgent" / "medium" / "normal"
     * urgent → 不過濾（緊急公告必達）
     * medium → 檢查 info_medium 設定
     * normal → 檢查 info_normal 設定
     */
    @Async
    public void onNewInfo(Long neighborhoodId, String postType, Long postId,
                          String title, String body, String urgency) {
        String settingColumn = resolveInfoSettingColumn(urgency);
        if ("district_info".equals(postType)) {
            fanOutDistrict(neighborhoodId, "new_info", settingColumn,
                    title, body, "post", postId, null);
        } else {
            fanOut(neighborhoodId, "new_info", settingColumn,
                    title, body, "post", postId, null);
        }
    }

    /** 貼文有新回覆 — 通知貼文作者 */
    @Async
    public void onPostReply(Long postAuthorId, Long commenterId, Long postId,
                            String commenterName, String commentBody) {
        if (postAuthorId.equals(commenterId)) return; // 不通知自己
        String title = commenterName + " 回覆了你的貼文";
        notifyUser(postAuthorId, "post_reply", title, commentBody, "post", postId);
    }

    /** 里聊聊訊息 — 通知關注該里的使用者（排除發訊者），同一聊天室合併 */
    @Async
    public void onChatMessage(Long neighborhoodId, Long senderId, Long messageId,
                              Long roomId, String senderName, String body) {
        Neighborhood nh = neighborhoodMapper.selectById(neighborhoodId);
        String roomLabel = nh != null ? nh.getName() + "聊聊" : "里聊聊";
        String title = senderName + " 在" + roomLabel + "發了訊息";
        fanOutChatMerged(neighborhoodId, senderId, title, body, "chat_li", messageId, roomId, false);
    }

    /** 區聊聊訊息 — 通知關注該區所有里的使用者（排除發訊者），同一聊天室合併 */
    @Async
    public void onDistrictChatMessage(Long representativeNhId, Long senderId, Long messageId,
                                      Long roomId, String senderName, String body) {
        Neighborhood nh = neighborhoodMapper.selectById(representativeNhId);
        String roomLabel = nh != null ? nh.getDistrict() + "聊聊" : "區聊聊";
        String title = senderName + " 在" + roomLabel + "發了訊息";
        fanOutChatMerged(representativeNhId, senderId, title, body, "chat_district", messageId, roomId, true);
    }

    /** 私訊 — 只通知接收方。同一發送者的未讀通知會合併（更新內容），不重複建立 */
    @Async
    public void onPrivateMessage(Long recipientId, Long senderId,
                                 String senderName, String body) {
        log.info("[通知] 私訊：{} (userId={}) 發訊給 userId={}", senderName, senderId, recipientId);
        if (!isEnabled(recipientId, "private_message")) { log.info("[通知] → 跳過：userId={} 私訊通知已關閉", recipientId); return; }
        String title = senderName + " 傳給你私訊";
        String shortBody = body != null && body.length() > 500 ? body.substring(0, 500) : body;

        // 合併：同一發送者的未讀私訊通知只保留一則，更新內容
        Notification existing = notificationMapper.selectOne(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, recipientId)
                        .eq(Notification::getType, "private_message")
                        .eq(Notification::getRefType, "user")
                        .eq(Notification::getRefId, senderId)
                        .eq(Notification::getIsRead, 0)
                        .last("LIMIT 1"));
        if (existing != null) {
            existing.setBody(shortBody);
            existing.setCreatedAt(java.time.LocalDateTime.now());
            notificationMapper.updateById(existing);
        } else {
            insertNotification(recipientId, "private_message", title, shortBody, "user", senderId, null);
        }
        pushWs(recipientId, "private_message", title, body, "user", senderId);
        List<String> tokens = deviceTokenMapper.findTokensByUserId(recipientId);
        sendFcm(tokens, title, body, "private_message", "user", senderId);
    }

    /**
     * 解析內容中的 @[暱稱](userId) 並通知被提及的用戶。
     * @param content     含 mention 的文字
     * @param authorId    發文/發訊者（排除自己）
     * @param authorName  發文/發訊者暱稱
     * @param refType     "post" / "chat_message"
     * @param refId       貼文 ID / 訊息 ID
     */
    @Async
    public void onMention(String content, Long authorId, String authorName,
                          String refType, Long refId) {
        if (content == null) return;
        // 解析 @[暱稱](userId)
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("@\\[([^\\]]+)\\]\\((\\d+)\\)").matcher(content);
        java.util.Set<Long> notified = new java.util.HashSet<>();
        while (matcher.find()) {
            Long mentionedUserId = Long.parseLong(matcher.group(2));
            if (mentionedUserId.equals(authorId)) continue;
            if (notified.contains(mentionedUserId)) continue;
            notified.add(mentionedUserId);
            String title = authorName + " 提及了你";
            String body = content.length() > 80 ? content.substring(0, 80) + "…" : content;
            // 用 stripMentionFormat 清理 body
            body = body.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1");
            notifyUser(mentionedUserId, "mention", title, body, refType, refId);
        }
    }

    /**
     * 群聊通知合併：同一聊天室（同 neighborhoodId）的未讀通知只保留一則，更新內容。
     */
    private void fanOutChatMerged(Long neighborhoodId, Long senderId,
                                   String title, String body, String refType, Long refId,
                                   Long roomId, boolean isDistrict) {
        List<UserFollowPair> pairs;
        if (isDistrict) {
            Neighborhood nh = neighborhoodMapper.selectById(neighborhoodId);
            if (nh == null) return;
            List<Long> districtNhIds = neighborhoodMapper.selectList(
                    new LambdaQueryWrapper<Neighborhood>()
                            .eq(Neighborhood::getCity, nh.getCity())
                            .eq(Neighborhood::getDistrict, nh.getDistrict())
                            .eq(Neighborhood::getStatus, 1)
                            .select(Neighborhood::getId)
            ).stream().map(Neighborhood::getId).toList();
            pairs = settingsMapper.findEnabledUsersByNeighborhoods(districtNhIds, "chat");
        } else {
            pairs = settingsMapper.findEnabledUsersByNeighborhood(neighborhoodId, "chat");
        }
        if (senderId != null) pairs = pairs.stream()
                .filter(p -> !p.getUserId().equals(senderId)).toList();

        String cleanBody = body != null ? body.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1") : null;
        String cleanTitle = title != null ? title.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1") : null;
        String shortBody = cleanBody != null && cleanBody.length() > 500 ? cleanBody.substring(0, 500) : cleanBody;

        java.util.Set<Long> processed = new java.util.HashSet<>();
        for (UserFollowPair pair : pairs) {
            if (!processed.add(pair.getUserId())) continue; // 同一用戶只處理一次
            Notification existing = notificationMapper.selectOne(
                    new LambdaQueryWrapper<Notification>()
                            .eq(Notification::getUserId, pair.getUserId())
                            .eq(Notification::getType, "chat")
                            .eq(Notification::getRefType, refType)
                            .eq(Notification::getIsRead, 0)
                            .last("LIMIT 1"));
            if (existing != null) {
                existing.setTitle(cleanTitle);
                existing.setBody(shortBody);
                existing.setRefId(refId);
                existing.setCreatedAt(java.time.LocalDateTime.now());
                notificationMapper.updateById(existing);
            } else {
                Notification n = new Notification();
                n.setUserId(pair.getUserId());
                n.setType("chat");
                n.setTitle(cleanTitle);
                n.setBody(shortBody);
                n.setRefType(refType);
                n.setRefId(refId);
                n.setNeighborhoodId(pair.getNeighborhoodId());
                n.setIsRead(0);
                notificationMapper.insert(n);
            }
            log.info("[通知] 群聊 → userId={} | refType={} roomId={} | 合併={}", pair.getUserId(), refType, roomId, existing != null ? "更新" : "新增");
            var wsData = new java.util.HashMap<>(Map.of(
                    "type", (Object) "chat", "title", (Object) (cleanTitle != null ? cleanTitle : title),
                    "body", (Object) (body != null ? body : ""),
                    "refType", (Object) (refType != null ? refType : ""),
                    "refId", (Object) (refId != null ? refId : 0)));
            if (roomId != null) wsData.put("roomId", roomId);
            try {
                ws.convertAndSend("/topic/user/" + pair.getUserId(), wsData);
                log.info("[推播] WS → userId={} | type=chat refType={} roomId={}", pair.getUserId(), refType, roomId);
            } catch (Exception e) {
                log.warn("[推播] WS 失敗 → userId={} | {}", pair.getUserId(), e.getMessage());
            }
        }
        Map<String, String> extra = roomId != null ? Map.of("roomId", String.valueOf(roomId)) : null;
        List<String> tokens = deviceTokenMapper.findTokensByUserIds(new java.util.ArrayList<>(processed));
        sendFcm(tokens, cleanTitle != null ? cleanTitle : title, body, "chat", refType, refId, extra);
    }

    // ── 內部邏輯 ─────────────────────────────────────────────────────────

    private void fanOut(Long neighborhoodId, String notifType, String settingColumn,
                        String title, String body, String refType, Long refId, Long excludeUserId) {
        List<UserFollowPair> pairs = settingsMapper.findEnabledUsersByNeighborhood(
                neighborhoodId, settingColumn);
        if (excludeUserId != null) pairs = pairs.stream()
                .filter(p -> !p.getUserId().equals(excludeUserId)).toList();
        log.info("[通知] fanOut | type={} nhId={} | 推播 {} 人（排除 userId={}）", notifType, neighborhoodId, pairs.size(), excludeUserId);

        for (UserFollowPair pair : pairs) {
            insertNotification(pair.getUserId(), notifType, title, body,
                    refType, refId, pair.getNeighborhoodId());
            pushWs(pair.getUserId(), notifType, title, body, refType, refId);
        }
        pushFcm(pairs.stream().map(UserFollowPair::getUserId).toList(),
                title, body, notifType, refType, refId);
    }

    private void fanOutDistrict(Long representativeNhId, String notifType, String settingColumn,
                                String title, String body, String refType, Long refId,
                                Long excludeUserId) {
        Neighborhood nh = neighborhoodMapper.selectById(representativeNhId);
        if (nh == null) return;

        List<Long> districtNhIds = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>()
                        .eq(Neighborhood::getCity, nh.getCity())
                        .eq(Neighborhood::getDistrict, nh.getDistrict())
                        .eq(Neighborhood::getStatus, 1)
                        .select(Neighborhood::getId)
        ).stream().map(Neighborhood::getId).toList();

        List<UserFollowPair> pairs = settingsMapper.findEnabledUsersByNeighborhoods(
                districtNhIds, settingColumn);
        if (excludeUserId != null) pairs = pairs.stream()
                .filter(p -> !p.getUserId().equals(excludeUserId)).toList();

        for (UserFollowPair pair : pairs) {
            insertNotification(pair.getUserId(), notifType, title, body,
                    refType, refId, pair.getNeighborhoodId());
            pushWs(pair.getUserId(), notifType, title, body, refType, refId);
        }
        pushFcm(pairs.stream().map(UserFollowPair::getUserId).toList(),
                title, body, notifType, refType, refId);
    }

    private void notifyUser(Long userId, String notifType,
                            String title, String body, String refType, Long refId) {
        if (!isEnabled(userId, notifType)) return;
        insertNotification(userId, notifType, title, body, refType, refId, null);
        pushWs(userId, notifType, title, body, refType, refId);
        List<String> tokens = deviceTokenMapper.findTokensByUserId(userId);
        sendFcm(tokens, title, body, notifType, refType, refId);
    }

    private void insertNotification(Long userId, String type,
                                    String title, String body, String refType, Long refId,
                                    Long neighborhoodId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title != null ? title.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1") : null);
        String cleanBody = body != null ? body.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1") : null;
        n.setBody(cleanBody != null && cleanBody.length() > 500 ? cleanBody.substring(0, 500) : cleanBody);
        n.setRefType(refType);
        n.setRefId(refId);
        n.setNeighborhoodId(neighborhoodId);
        n.setIsRead(0);
        notificationMapper.insert(n);
    }

    private void pushWs(Long userId, String type, String title, String body,
                        String refType, Long refId) {
        try {
            ws.convertAndSend("/topic/user/" + userId,
                    Map.of("type", type, "title", title,
                           "body", body != null ? body : "",
                           "refType", refType != null ? refType : "",
                           "refId",   refId   != null ? refId   : 0));
            log.info("[推播] WS → userId={} | type={} refType={} | title={}", userId, type, refType, title);
        } catch (Exception e) {
            log.warn("[推播] WS 失敗 → userId={} | {}", userId, e.getMessage());
        }
    }

    private void pushFcm(List<Long> userIds, String title, String body,
                         String notifType, String refType, Long refId) {
        if (fcm == null || userIds.isEmpty()) return;
        List<String> tokens = deviceTokenMapper.findTokensByUserIds(userIds);
        sendFcm(tokens, title, body, notifType, refType, refId);
    }

    private void sendFcm(List<String> tokens, String title, String body,
                         String notifType, String refType, Long refId) {
        sendFcm(tokens, title, body, notifType, refType, refId, null);
    }

    private void sendFcm(List<String> tokens, String title, String body,
                         String notifType, String refType, Long refId,
                         Map<String, String> extraData) {
        if (fcm == null || tokens.isEmpty()) return;
        String cleanBody = body != null ? body.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1") : null;
        String shortBody = cleanBody != null && cleanBody.length() > 100 ? cleanBody.substring(0, 100) + "…" : cleanBody;
        try {
            for (int i = 0; i < tokens.size(); i += 500) {
                List<String> batch = tokens.subList(i, Math.min(i + 500, tokens.size()));
                var builder = MulticastMessage.builder()
                        .setNotification(com.google.firebase.messaging.Notification.builder()
                                .setTitle(title != null ? title.replaceAll("@\\[([^\\]]+)\\]\\(\\d+\\)", "@$1") : title)
                                .setBody(shortBody)
                                .build())
                        .addAllTokens(batch);
                // 攜帶 data 供 App 點擊通知時導頁
                if (notifType != null) builder.putData("notifType", notifType);
                if (refType   != null) builder.putData("refType", refType);
                if (refId     != null) builder.putData("refId", String.valueOf(refId));
                if (extraData != null) extraData.forEach(builder::putData);
                BatchResponse resp = fcm.sendEachForMulticast(builder.build());
                log.info("[推播] FCM → {} 成功 {} 失敗 | notifType={} refType={} | tokens={}", resp.getSuccessCount(), resp.getFailureCount(), notifType, refType, batch.size());
                cleanInvalidTokens(batch, resp);
            }
        } catch (Exception e) {
            log.warn("[推播] FCM 失敗 | {}", e.getMessage());
        }
    }

    private void cleanInvalidTokens(List<String> tokens, BatchResponse resp) {
        var responses = resp.getResponses();
        for (int i = 0; i < responses.size(); i++) {
            SendResponse sr = responses.get(i);
            if (!sr.isSuccessful()) {
                MessagingErrorCode code = sr.getException().getMessagingErrorCode();
                if (code == MessagingErrorCode.UNREGISTERED
                        || code == MessagingErrorCode.INVALID_ARGUMENT) {
                    deviceTokenMapper.delete(new LambdaQueryWrapper<UserDeviceToken>()
                            .eq(UserDeviceToken::getToken, tokens.get(i)));
                }
            }
        }
    }

    private boolean isEnabled(Long userId, String type) {
        UserNotificationSettings s = settingsMapper.selectById(userId);
        if (s == null) return true; // 預設全開
        if (s.getMaster() != null && s.getMaster() == 0) return false;
        return switch (type) {
            case "new_post"        -> s.getNewPost()        != 0;
            case "follow_post"     -> s.getFollowPost()     != null ? s.getFollowPost() != 0 : true;
            case "chat"            -> s.getChat()           != 0;
            case "private_message" -> s.getPrivateMessage() != 0;
            case "post_reply"      -> s.getPostReply()      != 0;
            case "mention"         -> s.getMention() != null ? s.getMention() != 0 : true;
            default                -> true;
        };
    }

    /**
     * 根據緊急程度決定用哪個設定欄位過濾。
     * urgent → master（緊急公告必達，只要總開關開啟即送達）
     * medium → info_medium
     * normal → info_normal
     */
    private String resolveInfoSettingColumn(String urgency) {
        if (urgency == null) return "info_normal";
        return switch (urgency) {
            case "urgent" -> "master";
            case "medium" -> "info_medium";
            default       -> "info_normal";
        };
    }
}
