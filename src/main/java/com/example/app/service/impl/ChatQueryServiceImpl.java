package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.dto.chat.ChatRoomResponse;
import com.example.app.entity.ChatMessage;
import com.example.app.entity.ChatRoom;
import com.example.app.entity.LiChief;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.User;
import com.example.app.entity.ChatReadCursor;
import com.example.app.mapper.ChatMessageMapper;
import com.example.app.mapper.ChatReadCursorMapper;
import com.example.app.mapper.ChatRoomMapper;
import com.example.app.mapper.LiChiefMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.ChatQueryService;
import com.example.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatQueryServiceImpl implements ChatQueryService {

    private final ChatRoomMapper chatRoomMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final ChatReadCursorMapper chatReadCursorMapper;
    private final UserMapper userMapper;
    private final LiChiefMapper liChiefMapper;
    private final NeighborhoodMapper neighborhoodMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ChatRoomResponse getOrCreateRoom(Long neighborhoodId, String neighborhoodName) {
        ChatRoom room = chatRoomMapper.selectOne(
                new LambdaQueryWrapper<ChatRoom>()
                        .eq(ChatRoom::getNeighborhoodId, neighborhoodId)
                        .eq(ChatRoom::getType, "neighborhood")
        );

        if (room == null) {
            room = new ChatRoom();
            room.setNeighborhoodId(neighborhoodId);
            room.setName(neighborhoodName + " 聊聊");
            room.setType("neighborhood");
            room.setMemberCount(0);
            room.setStatus(1);
            chatRoomMapper.insert(room);
        }

        return ChatRoomResponse.from(room);
    }

    @Override
    @Transactional
    public ChatRoomResponse getOrCreateDistrictRoom(String city, String district) {
        ChatRoom room = chatRoomMapper.selectOne(
                new LambdaQueryWrapper<ChatRoom>()
                        .eq(ChatRoom::getType, "district")
                        .eq(ChatRoom::getName, city + district + " 聊聊")
        );

        if (room == null) {
            room = new ChatRoom();
            room.setName(city + district + " 聊聊");
            room.setType("district");
            room.setMemberCount(0);
            room.setStatus(1);
            chatRoomMapper.insert(room);
        }

        return ChatRoomResponse.from(room);
    }

    @Override
    public List<ChatMessageResponse> getMessages(Long roomId, Long before, int limit) {
        int safeLimit = Math.min(limit, 50);

        LambdaQueryWrapper<ChatMessage> wrapper = new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getRoomId, roomId)
                .lt(before != null, ChatMessage::getId, before)
                .orderByDesc(ChatMessage::getId)
                .last("LIMIT " + safeLimit);

        List<ChatMessage> messages = new ArrayList<>(chatMessageMapper.selectList(wrapper));
        Collections.reverse(messages);
        if (messages.isEmpty()) return List.of();

        // Batch-load current nicknames + badges from DB
        List<Long> userIds = messages.stream().map(ChatMessage::getUserId).distinct().toList();
        Map<Long, String> nicknameMap = buildNicknameMap(userIds);
        Map<Long, String> badgeMap = buildBadgeMap(userIds);
        Map<Long, String> avatarMap = buildAvatarMap(userIds);

        return messages.stream()
                .map(m -> {
                    ChatMessageResponse resp = ChatMessageResponse.from(m, nicknameMap.get(m.getUserId()));
                    resp.setAuthorBadge(badgeMap.get(m.getUserId()));
                    resp.setAvatarUrl(avatarMap.get(m.getUserId()));
                    return resp;
                })
                .toList();
    }

    @Override
    @Transactional
    public ChatRoomResponse getOrCreatePrivateRoom(Long requesterId, Long targetId) {
        // 驗證對方用戶存在
        if (userMapper.selectById(targetId) == null) {
            throw new com.example.app.common.exception.BusinessException(
                    com.example.app.common.result.ResultCode.NOT_FOUND, "用戶不存在");
        }
        // 正規化：較小 ID 存 user1_id
        Long u1 = Math.min(requesterId, targetId);
        Long u2 = Math.max(requesterId, targetId);

        ChatRoom room = chatRoomMapper.selectOne(
                new LambdaQueryWrapper<ChatRoom>()
                        .eq(ChatRoom::getType, "private")
                        .eq(ChatRoom::getUser1Id, u1)
                        .eq(ChatRoom::getUser2Id, u2)
        );

        if (room == null) {
            room = new ChatRoom();
            room.setType("private");
            room.setUser1Id(u1);
            room.setUser2Id(u2);
            room.setName("私聊");
            room.setMemberCount(2);
            room.setStatus(1);
            chatRoomMapper.insert(room);
        }

        ChatRoomResponse resp = ChatRoomResponse.from(room);
        Map<Long, String> badgeMap = buildBadgeMap(List.of(targetId));
        resp.setOtherBadge(badgeMap.get(targetId));
        return resp;
    }

    @Override
    public List<ChatRoomResponse> listPrivateRooms(Long userId) {
        List<ChatRoom> rooms = chatRoomMapper.selectList(
                new LambdaQueryWrapper<ChatRoom>()
                        .eq(ChatRoom::getType, "private")
                        .and(w -> w.eq(ChatRoom::getUser1Id, userId)
                                   .or().eq(ChatRoom::getUser2Id, userId))
                        .orderByDesc(ChatRoom::getLastMessageAt)
        );
        if (rooms.isEmpty()) return List.of();

        // 批次撈對方暱稱 + 徽章
        List<Long> otherIds = rooms.stream()
                .map(r -> r.getUser1Id().equals(userId) ? r.getUser2Id() : r.getUser1Id())
                .distinct().toList();
        List<User> otherUsers = userMapper.selectBatchIds(otherIds);
        Map<Long, String> nicknameMap = otherUsers.stream()
                .collect(Collectors.toMap(User::getId, u -> u.getNickname() != null ? u.getNickname() : "用戶 #" + u.getId()));
        Map<Long, String> otherAvatarMap = new HashMap<>();
        for (User u : otherUsers) {
            String url = u.getEffectiveAvatarUrl();
            if (url != null) otherAvatarMap.put(u.getId(), url);
        }
        Map<Long, String> badgeMap = buildBadgeMap(otherIds);

        return rooms.stream()
                .map(r -> {
                    Long otherId = r.getUser1Id().equals(userId) ? r.getUser2Id() : r.getUser1Id();
                    ChatRoomResponse resp = ChatRoomResponse.from(r, nicknameMap.getOrDefault(otherId, "用戶 #" + otherId));
                    resp.setOtherBadge(badgeMap.get(otherId));
                    resp.setOtherAvatarUrl(otherAvatarMap.get(otherId));
                    return resp;
                })
                .toList();
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long roomId, Long userId, String content) {
        return sendMessage(roomId, userId, content, null);
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long roomId, Long userId, String content, java.util.List<String> images) {
        String nickname = resolveNickname(userId);

        ChatMessage msg = new ChatMessage();
        msg.setRoomId(roomId);
        msg.setUserId(userId);
        msg.setNickname(nickname);
        msg.setContent(content);
        msg.setType(images != null && !images.isEmpty() ? "image" : "text");
        msg.setImages(images);
        chatMessageMapper.insert(msg);

        // 更新 chat_room 的 last_message 快取
        String preview = (content != null && !content.isBlank()) ? content
                : (images != null && !images.isEmpty()) ? "[圖片]" : "";
        ChatRoom room = chatRoomMapper.selectById(roomId);
        ChatRoom patch = new ChatRoom();
        patch.setId(roomId);
        patch.setLastMessage(preview.length() > 50 ? preview.substring(0, 50) + "…" : preview);
        patch.setLastMessageNickname(nickname);
        patch.setLastMessageUserId(userId);
        patch.setLastMessageAt(LocalDateTime.now());
        chatRoomMapper.updateById(patch);

        // 通知
        if (room != null) {
            String shortContent = preview.length() > 80 ? preview.substring(0, 80) + "…" : preview;
            if ("private".equals(room.getType())) {
                // 私訊：通知對方
                Long recipientId = userId.equals(room.getUser1Id()) ? room.getUser2Id() : room.getUser1Id();
                notificationService.onPrivateMessage(recipientId, userId, nickname, shortContent);
            } else if ("district".equals(room.getType())) {
                // 區聊聊：從 room name 解析 city+district，找代表里通知
                String roomName = room.getName(); // e.g. "基隆市七堵區 聊聊"
                if (roomName != null) {
                    String cd = roomName.replace(" 聊聊", "");
                    for (String[] aliases : com.example.app.aggregator.AggregatorSupport.COUNTY_ALIASES) {
                        for (String alias : aliases) {
                            if (cd.startsWith(alias)) {
                                String dist = cd.substring(alias.length());
                                Neighborhood repNh = neighborhoodMapper.selectOne(
                                        new LambdaQueryWrapper<Neighborhood>()
                                                .eq(Neighborhood::getCity, aliases[0])
                                                .eq(Neighborhood::getDistrict, dist)
                                                .eq(Neighborhood::getStatus, 1)
                                                .last("LIMIT 1"));
                                if (repNh == null && !alias.equals(aliases[0])) {
                                    repNh = neighborhoodMapper.selectOne(
                                            new LambdaQueryWrapper<Neighborhood>()
                                                    .eq(Neighborhood::getCity, alias)
                                                    .eq(Neighborhood::getDistrict, dist)
                                                    .eq(Neighborhood::getStatus, 1)
                                                    .last("LIMIT 1"));
                                }
                                if (repNh != null) {
                                    notificationService.onDistrictChatMessage(repNh.getId(), userId,
                                            msg.getId(), roomId, nickname, shortContent);
                                }
                                break;
                            }
                        }
                    }
                }
            } else if (room.getNeighborhoodId() != null) {
                // 里聊聊：通知里內其他使用者
                notificationService.onChatMessage(room.getNeighborhoodId(), userId,
                        msg.getId(), roomId, nickname, shortContent);
            }
        }

        // @ 提及通知
        notificationService.onMention(content, userId, nickname, "chat_message", msg.getId());

        ChatMessageResponse resp = ChatMessageResponse.from(msg);
        Map<Long, String> badgeMap = buildBadgeMap(List.of(userId));
        resp.setAuthorBadge(badgeMap.get(userId));
        Map<Long, String> avMap = buildAvatarMap(List.of(userId));
        resp.setAvatarUrl(avMap.get(userId));
        return resp;
    }

    @Override
    public Map<Long, Integer> getUnreadCounts(Long userId, List<Long> roomIds) {
        if (roomIds == null || roomIds.isEmpty()) return Map.of();
        List<Map<String, Object>> rows = chatReadCursorMapper.countUnreadByRooms(userId, roomIds);
        Map<Long, Integer> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Long roomId = ((Number) row.get("room_id")).longValue();
            int count = ((Number) row.get("unread_count")).intValue();
            result.put(roomId, count);
        }
        return result;
    }

    @Override
    @Transactional
    public void markRead(Long userId, Long roomId) {
        // 取得該聊天室最新訊息 ID
        LambdaQueryWrapper<ChatMessage> wrapper = new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getRoomId, roomId)
                .orderByDesc(ChatMessage::getId)
                .last("LIMIT 1");
        ChatMessage latest = chatMessageMapper.selectOne(wrapper);
        long latestId = latest != null ? latest.getId() : 0;

        ChatReadCursor cursor = chatReadCursorMapper.selectOne(
                new LambdaQueryWrapper<ChatReadCursor>()
                        .eq(ChatReadCursor::getUserId, userId)
                        .eq(ChatReadCursor::getRoomId, roomId)
        );
        if (cursor == null) {
            cursor = new ChatReadCursor();
            cursor.setUserId(userId);
            cursor.setRoomId(roomId);
            cursor.setLastReadMsgId(latestId);
            chatReadCursorMapper.insert(cursor);
        } else {
            cursor.setLastReadMsgId(latestId);
            chatReadCursorMapper.updateById(cursor);
        }
    }

    private String resolveNickname(Long userId) {
        List<User> users = userMapper.selectBatchIds(List.of(userId));
        if (users.isEmpty()) return null;
        User u = users.get(0);
        if (u.getNickname() != null) return u.getNickname();
        if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
        return null;
    }

    private Map<Long, String> buildNicknameMap(List<Long> userIds) {
        return userMapper.selectBatchIds(userIds).stream().collect(Collectors.toMap(
                User::getId,
                u -> {
                    if (u.getNickname() != null) return u.getNickname();
                    if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
                    return "用戶 #" + u.getId();
                }
        ));
    }

    /** userId → 里長徽章文字（如「堵南里里長」），非里長回傳 null */
    private Map<Long, String> buildBadgeMap(List<Long> userIds) {
        try {
            if (userIds.isEmpty()) return Map.of();
            List<LiChief> chiefs = liChiefMapper.selectList(
                    new LambdaQueryWrapper<LiChief>().in(LiChief::getUserId, userIds));
            if (chiefs.isEmpty()) return Map.of();
            List<Long> nhIds = chiefs.stream().map(LiChief::getNeighborhoodId).toList();
            Map<Long, Neighborhood> nhMap = neighborhoodMapper.selectBatchIds(nhIds).stream()
                    .collect(Collectors.toMap(Neighborhood::getId, n -> n));
            Map<Long, String> result = new HashMap<>();
            for (LiChief c : chiefs) {
                Neighborhood nh = nhMap.get(c.getNeighborhoodId());
                result.put(c.getUserId(), nh != null ? nh.getName() + "里長" : "里長");
            }
            return result;
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<Long, String> buildAvatarMap(List<Long> userIds) {
        if (userIds.isEmpty()) return Map.of();
        Map<Long, String> map = new HashMap<>();
        for (User u : userMapper.selectBatchIds(userIds)) {
            String url = u.getEffectiveAvatarUrl();
            if (url != null) map.put(u.getId(), url);
        }
        return map;
    }
}
