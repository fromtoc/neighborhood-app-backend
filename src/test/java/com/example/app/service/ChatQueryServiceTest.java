package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.dto.chat.ChatRoomResponse;
import com.example.app.entity.ChatMessage;
import com.example.app.entity.ChatRoom;
import com.example.app.entity.User;
import com.example.app.mapper.ChatMessageMapper;
import com.example.app.mapper.ChatRoomMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.impl.ChatQueryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatQueryServiceTest {

    @Mock ChatRoomMapper chatRoomMapper;
    @Mock ChatMessageMapper chatMessageMapper;
    @Mock UserMapper userMapper;

    @InjectMocks ChatQueryServiceImpl service;

    // ── getOrCreateRoom ───────────────────────────────────────

    @Test
    void getOrCreateRoom_existingRoom_returnsIt() {
        ChatRoom existing = room(1L, 10L, "樂善里 聊聊");
        when(chatRoomMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(existing);

        ChatRoomResponse result = service.getOrCreateRoom(10L, "樂善里");

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("樂善里 聊聊");
        verify(chatRoomMapper, never()).insert(argThat((ChatRoom r) -> true));
    }

    @Test
    void getOrCreateRoom_noRoom_createsNew() {
        when(chatRoomMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(chatRoomMapper.insert(any((Class<ChatRoom>) ChatRoom.class))).thenReturn(1);

        ChatRoomResponse result = service.getOrCreateRoom(10L, "樂善里");

        verify(chatRoomMapper).insert(argThat((ChatRoom r) -> r != null));
        assertThat(result.getName()).isEqualTo("樂善里 聊聊");
    }

    // ── getMessages ───────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void getMessages_returnsInChronologicalOrder() {
        ChatMessage m1 = msg(2L, 1L, 1L, "second");
        ChatMessage m2 = msg(1L, 1L, 1L, "first");
        when(chatMessageMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(m1, m2));
        when(userMapper.selectBatchIds(any(List.class))).thenReturn(List.of(userWith(1L, "Alice")));

        List<ChatMessageResponse> result = service.getMessages(1L, null, 30);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getContent()).isEqualTo("first");
        assertThat(result.get(1).getContent()).isEqualTo("second");
    }

    @Test
    void getMessages_emptyRoom_returnsEmptyList() {
        when(chatMessageMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertThat(service.getMessages(1L, null, 30)).isEmpty();
    }

    // ── sendMessage ───────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void sendMessage_savesAndUpdatesRoom() {
        when(userMapper.selectBatchIds(any(List.class))).thenReturn(List.of(userWith(42L, "小明")));
        when(chatMessageMapper.insert(any((Class<ChatMessage>) ChatMessage.class))).thenReturn(1);
        when(chatRoomMapper.updateById(any(ChatRoom.class))).thenReturn(1);

        ChatMessageResponse result = service.sendMessage(1L, 42L, "Hello 鄰居！");

        assertThat(result.getContent()).isEqualTo("Hello 鄰居！");
        assertThat(result.getUserId()).isEqualTo(42L);
        assertThat(result.getNickname()).isEqualTo("小明");
        verify(chatRoomMapper).updateById(any(ChatRoom.class));
    }

    @SuppressWarnings("unchecked")
    @Test
    void sendMessage_longContent_truncatesLastMessage() {
        String longContent = "A".repeat(100);
        when(userMapper.selectBatchIds(any(List.class))).thenReturn(List.of(userWith(1L, "用戶")));
        when(chatMessageMapper.insert(any((Class<ChatMessage>) ChatMessage.class))).thenReturn(1);

        doAnswer(inv -> {
            ChatRoom r = inv.getArgument(0);
            assertThat(r.getLastMessage()).endsWith("…");
            assertThat(r.getLastMessage().length()).isLessThanOrEqualTo(51);
            return 1;
        }).when(chatRoomMapper).updateById(any(ChatRoom.class));

        service.sendMessage(1L, 1L, longContent);

        verify(chatRoomMapper).updateById(any(ChatRoom.class));
    }

    // ── getOrCreatePrivateRoom ────────────────────────────────

    @Test
    void getOrCreatePrivateRoom_existingRoom_returnsIt() {
        ChatRoom existing = privateRoom(5L, 2L, 8L);
        when(chatRoomMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(existing);

        ChatRoomResponse result = service.getOrCreatePrivateRoom(8L, 2L);

        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getUser1Id()).isEqualTo(2L);
        assertThat(result.getUser2Id()).isEqualTo(8L);
        verify(chatRoomMapper, never()).insert(argThat((ChatRoom r) -> true));
    }

    @Test
    void getOrCreatePrivateRoom_noRoom_createsNew() {
        when(chatRoomMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        when(chatRoomMapper.insert(any((Class<ChatRoom>) ChatRoom.class))).thenReturn(1);

        service.getOrCreatePrivateRoom(3L, 7L);

        verify(chatRoomMapper).insert(argThat((ChatRoom r) ->
                r.getUser1Id().equals(3L) && r.getUser2Id().equals(7L) && "private".equals(r.getType())
        ));
    }

    // ── helper ────────────────────────────────────────────────

    private ChatRoom privateRoom(Long id, Long user1Id, Long user2Id) {
        ChatRoom r = new ChatRoom();
        r.setId(id);
        r.setType("private");
        r.setUser1Id(user1Id);
        r.setUser2Id(user2Id);
        r.setName("私聊");
        r.setMemberCount(2);
        r.setStatus(1);
        return r;
    }

    private ChatRoom room(Long id, Long neighborhoodId, String name) {
        ChatRoom r = new ChatRoom();
        r.setId(id);
        r.setNeighborhoodId(neighborhoodId);
        r.setName(name);
        r.setType("neighborhood");
        r.setMemberCount(0);
        r.setStatus(1);
        return r;
    }

    private ChatMessage msg(Long id, Long roomId, Long userId, String content) {
        ChatMessage m = new ChatMessage();
        m.setId(id);
        m.setRoomId(roomId);
        m.setUserId(userId);
        m.setContent(content);
        m.setType("text");
        m.setCreatedAt(LocalDateTime.now());
        return m;
    }

    private User userWith(Long id, String nickname) {
        User u = new User();
        u.setId(id);
        u.setNickname(nickname);
        u.setIsGuest(0);
        return u;
    }
}
