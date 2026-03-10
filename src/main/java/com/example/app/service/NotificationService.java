package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Notification;
import com.example.app.entity.UserDeviceToken;
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
    private final SimpMessagingTemplate           ws;

    @Autowired(required = false)
    private FirebaseMessaging fcm;

    // ── 公開方法 ─────────────────────────────────────────────────────────

    /** 新貼文（非系統）— 通知關注該里的使用者（排除發文者） */
    @Async
    public void onNewPost(Long neighborhoodId, Long authorId, Long postId,
                          String title, String body) {
        fanOut(neighborhoodId, "new_post", "new_post",
                title, body, "post", postId, authorId);
    }

    /** 新資訊（系統爬蟲）— 通知關注該里/區使用者 */
    @Async
    public void onNewInfo(Long neighborhoodId, String postType, Long postId,
                          String title, String body) {
        if ("district_info".equals(postType)) {
            fanOutDistrict(neighborhoodId, "new_info",
                    title, body, "post", postId, null);
        } else {
            fanOut(neighborhoodId, "new_info", "new_info",
                    title, body, "post", postId, null);
        }
    }

    /** 聊聊訊息（公開聊天室）— 通知關注該里的使用者（排除發訊者） */
    @Async
    public void onChatMessage(Long neighborhoodId, Long senderId, Long messageId,
                              String senderName, String body) {
        String title = senderName + " 在聊聊發了訊息";
        fanOut(neighborhoodId, "chat", "chat",
                title, body, "chat_message", messageId, senderId);
    }

    /** 私訊 — 只通知接收方。refType="user", refId=senderId，供前端開啟對話框用 */
    @Async
    public void onPrivateMessage(Long recipientId, Long senderId,
                                 String senderName, String body) {
        String title = senderName + " 傳給你私訊";
        notifyUser(recipientId, "private_message", title, body,
                "user", senderId);
    }

    // ── 內部邏輯 ─────────────────────────────────────────────────────────

    private void fanOut(Long neighborhoodId, String notifType, String settingColumn,
                        String title, String body, String refType, Long refId, Long excludeUserId) {
        List<UserFollowPair> pairs = settingsMapper.findEnabledUsersByNeighborhood(
                neighborhoodId, settingColumn);
        log.debug("fanOut type={} nhId={} exclude={} found={} pairs={}",
                notifType, neighborhoodId, excludeUserId, pairs.size(), pairs);
        if (excludeUserId != null) pairs = pairs.stream()
                .filter(p -> !p.getUserId().equals(excludeUserId)).toList();
        log.debug("fanOut after exclude: {} recipients", pairs.size());

        for (UserFollowPair pair : pairs) {
            insertNotification(pair.getUserId(), notifType, title, body,
                    refType, refId, pair.getNeighborhoodId());
            pushWs(pair.getUserId(), notifType, title, body, refType, refId);
        }
        pushFcm(pairs.stream().map(UserFollowPair::getUserId).toList(), title, body);
    }

    private void fanOutDistrict(Long representativeNhId, String notifType,
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
                districtNhIds, "new_info");
        if (excludeUserId != null) pairs = pairs.stream()
                .filter(p -> !p.getUserId().equals(excludeUserId)).toList();

        for (UserFollowPair pair : pairs) {
            insertNotification(pair.getUserId(), notifType, title, body,
                    refType, refId, pair.getNeighborhoodId());
            pushWs(pair.getUserId(), notifType, title, body, refType, refId);
        }
        pushFcm(pairs.stream().map(UserFollowPair::getUserId).toList(), title, body);
    }

    private void notifyUser(Long userId, String notifType,
                            String title, String body, String refType, Long refId) {
        if (!isEnabled(userId, notifType)) return;
        insertNotification(userId, notifType, title, body, refType, refId, null);
        pushWs(userId, notifType, title, body, refType, refId);
        List<String> tokens = deviceTokenMapper.findTokensByUserId(userId);
        sendFcm(tokens, title, body);
    }

    private void insertNotification(Long userId, String type,
                                    String title, String body, String refType, Long refId,
                                    Long neighborhoodId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body != null && body.length() > 500 ? body.substring(0, 500) : body);
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
        } catch (Exception e) {
            log.debug("WS push failed for userId={}", userId, e);
        }
    }

    private void pushFcm(List<Long> userIds, String title, String body) {
        if (fcm == null || userIds.isEmpty()) return;
        List<String> tokens = deviceTokenMapper.findTokensByUserIds(userIds);
        sendFcm(tokens, title, body);
    }

    private void sendFcm(List<String> tokens, String title, String body) {
        if (fcm == null || tokens.isEmpty()) return;
        String shortBody = body != null && body.length() > 100 ? body.substring(0, 100) + "…" : body;
        try {
            for (int i = 0; i < tokens.size(); i += 500) {
                List<String> batch = tokens.subList(i, Math.min(i + 500, tokens.size()));
                MulticastMessage msg = MulticastMessage.builder()
                        .setNotification(com.google.firebase.messaging.Notification.builder()
                                .setTitle(title)
                                .setBody(shortBody)
                                .build())
                        .addAllTokens(batch)
                        .build();
                BatchResponse resp = fcm.sendEachForMulticast(msg);
                log.debug("FCM: {} ok, {} fail", resp.getSuccessCount(), resp.getFailureCount());
                cleanInvalidTokens(batch, resp);
            }
        } catch (Exception e) {
            log.warn("FCM send failed", e);
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
        return switch (type) {
            case "new_post"        -> s.getNewPost()        != 0;
            case "new_info"        -> s.getNewInfo()        != 0;
            case "chat"            -> s.getChat()           != 0;
            case "private_message" -> s.getPrivateMessage() != 0;
            default                -> true;
        };
    }
}
