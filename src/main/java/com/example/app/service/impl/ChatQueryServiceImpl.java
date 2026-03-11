package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.dto.chat.ChatRoomResponse;
import com.example.app.entity.ChatMessage;
import com.example.app.entity.ChatRoom;
import com.example.app.entity.User;
import com.example.app.mapper.ChatMessageMapper;
import com.example.app.mapper.ChatRoomMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.ChatQueryService;
import com.example.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatQueryServiceImpl implements ChatQueryService {

    private final ChatRoomMapper chatRoomMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final UserMapper userMapper;
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

        // Batch-load current nicknames from DB
        List<Long> userIds = messages.stream().map(ChatMessage::getUserId).distinct().toList();
        Map<Long, String> nicknameMap = buildNicknameMap(userIds);

        return messages.stream()
                .map(m -> ChatMessageResponse.from(m, nicknameMap.get(m.getUserId())))
                .toList();
    }

    @Override
    @Transactional
    public ChatRoomResponse getOrCreatePrivateRoom(Long requesterId, Long targetId) {
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

        return ChatRoomResponse.from(room);
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

        // 批次撈對方暱稱
        List<Long> otherIds = rooms.stream()
                .map(r -> r.getUser1Id().equals(userId) ? r.getUser2Id() : r.getUser1Id())
                .distinct().toList();
        Map<Long, String> nicknameMap = userMapper.selectBatchIds(otherIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u.getNickname() != null ? u.getNickname() : "用戶 #" + u.getId()));

        return rooms.stream()
                .map(r -> {
                    Long otherId = r.getUser1Id().equals(userId) ? r.getUser2Id() : r.getUser1Id();
                    return ChatRoomResponse.from(r, nicknameMap.getOrDefault(otherId, "用戶 #" + otherId));
                })
                .toList();
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(Long roomId, Long userId, String content) {
        String nickname = resolveNickname(userId);

        ChatMessage msg = new ChatMessage();
        msg.setRoomId(roomId);
        msg.setUserId(userId);
        msg.setNickname(nickname);
        msg.setContent(content);
        msg.setType("text");
        chatMessageMapper.insert(msg);

        // 更新 chat_room 的 last_message 快取
        ChatRoom room = chatRoomMapper.selectById(roomId);
        ChatRoom patch = new ChatRoom();
        patch.setId(roomId);
        patch.setLastMessage(content.length() > 50 ? content.substring(0, 50) + "…" : content);
        patch.setLastMessageAt(LocalDateTime.now());
        chatRoomMapper.updateById(patch);

        // 通知
        if (room != null) {
            String shortContent = content.length() > 80 ? content.substring(0, 80) + "…" : content;
            if ("private".equals(room.getType())) {
                // 私訊：通知對方
                Long recipientId = userId.equals(room.getUser1Id()) ? room.getUser2Id() : room.getUser1Id();
                notificationService.onPrivateMessage(recipientId, msg.getId(), nickname, shortContent);
            } else if (room.getNeighborhoodId() != null) {
                // 聊聊：通知里內其他使用者
                notificationService.onChatMessage(room.getNeighborhoodId(), userId,
                        msg.getId(), nickname, shortContent);
            }
        }

        return ChatMessageResponse.from(msg);
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
}
