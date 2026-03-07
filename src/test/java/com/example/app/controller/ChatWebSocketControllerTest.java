package com.example.app.controller;

import com.example.app.dto.JwtClaims;
import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.service.ChatQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDateTime;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatWebSocketControllerTest {

    @Mock ChatQueryService chatQueryService;
    @Mock SimpMessagingTemplate messagingTemplate;

    @InjectMocks ChatWebSocketController controller;

    private JwtClaims claims;
    private UsernamePasswordAuthenticationToken principal;

    @BeforeEach
    void setUp() {
        claims = JwtClaims.builder()
                .userId(1L)
                .role(com.example.app.common.enums.UserRole.USER)
                .build();
        principal = new UsernamePasswordAuthenticationToken(claims, null);
    }

    @Test
    void sendMessage_authenticated_broadcastsToTopic() {
        Long roomId = 10L;
        Map<String, String> payload = Map.of("content", "Hello");
        ChatMessageResponse response = ChatMessageResponse.builder()
                .id(1L).roomId(roomId).userId(1L).nickname("小明")
                .content("Hello").type("TEXT").createdAt(LocalDateTime.now())
                .build();

        when(chatQueryService.sendMessage(roomId, 1L, "Hello")).thenReturn(response);

        controller.sendMessage(roomId, payload, principal);

        verify(chatQueryService).sendMessage(roomId, 1L, "Hello");
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/" + roomId), eq(response));
    }

    @Test
    void sendMessage_unauthenticated_doesNothing() {
        controller.sendMessage(10L, Map.of("content", "Hello"), null);

        verifyNoInteractions(chatQueryService);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void sendMessage_emptyContent_doesNothing() {
        controller.sendMessage(10L, Map.of("content", "   "), principal);

        verifyNoInteractions(chatQueryService);
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void sendMessage_contentTruncatedAt500Chars() {
        String longContent = "a".repeat(600);
        String truncated = "a".repeat(500);
        Long roomId = 10L;
        ChatMessageResponse response = ChatMessageResponse.builder()
                .id(1L).roomId(roomId).userId(1L).nickname(null)
                .content(truncated).type("TEXT").createdAt(LocalDateTime.now())
                .build();

        when(chatQueryService.sendMessage(roomId, 1L, truncated)).thenReturn(response);

        controller.sendMessage(roomId, Map.of("content", longContent), principal);

        verify(chatQueryService).sendMessage(roomId, 1L, truncated);
    }
}
