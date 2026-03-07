package com.example.app.controller;

import com.example.app.dto.JwtClaims;
import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.service.ChatQueryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
@Tag(name = "ChatWebSocket", description = "STOMP WebSocket 即時聊天")
public class ChatWebSocketController {

    private final ChatQueryService     chatQueryService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 客戶端發送訊息：/app/chat.send/{roomId}
     * 廣播到：/topic/rooms/{roomId}
     */
    @MessageMapping("/chat.send/{roomId}")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload Map<String, String> payload,
            Principal principal
    ) {
        if (principal == null) {
            log.warn("WS sendMessage rejected — unauthenticated, roomId={}", roomId);
            return;
        }

        JwtClaims claims = (JwtClaims) ((org.springframework.security.authentication
                .UsernamePasswordAuthenticationToken) principal).getPrincipal();

        String content = payload.get("content");

        if (content == null || content.isBlank()) return;
        if (content.length() > 500) content = content.substring(0, 500);

        ChatMessageResponse msg = chatQueryService.sendMessage(roomId, claims.getUserId(), content);

        // 廣播給所有訂閱此房間的客戶端
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, msg);
    }
}
