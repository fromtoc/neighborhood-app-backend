package com.example.app.dto.chat;

import com.example.app.entity.ChatMessage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMessageResponse {

    private Long id;
    private Long roomId;
    private Long userId;
    private String nickname;
    private String content;
    private String type;
    private LocalDateTime createdAt;

    public static ChatMessageResponse from(ChatMessage m) {
        return from(m, m.getNickname());
    }

    public static ChatMessageResponse from(ChatMessage m, String nickname) {
        return ChatMessageResponse.builder()
                .id(m.getId())
                .roomId(m.getRoomId())
                .userId(m.getUserId())
                .nickname(nickname)
                .content(m.getContent())
                .type(m.getType())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
