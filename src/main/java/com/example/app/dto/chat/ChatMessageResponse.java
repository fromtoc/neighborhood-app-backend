package com.example.app.dto.chat;

import com.example.app.entity.ChatMessage;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ChatMessageResponse {

    private Long id;
    private Long roomId;
    private Long userId;
    private String nickname;
    @Setter private String authorBadge;
    @Setter private String avatarUrl;
    private String content;
    private String type;
    private List<String> images;
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
                .images(m.getImages())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
