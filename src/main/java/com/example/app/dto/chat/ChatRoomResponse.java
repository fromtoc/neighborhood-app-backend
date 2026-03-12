package com.example.app.dto.chat;

import com.example.app.entity.ChatRoom;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatRoomResponse {

    private Long id;
    private Long neighborhoodId;
    private String name;
    private String type;
    private Long user1Id;
    private Long user2Id;
    private String otherNickname;
    private String lastMessage;
    private String lastMessageNickname;
    private Long lastMessageUserId;
    private LocalDateTime lastMessageAt;
    private Integer memberCount;

    public static ChatRoomResponse from(ChatRoom r) {
        return from(r, null);
    }

    public static ChatRoomResponse from(ChatRoom r, String otherNickname) {
        return ChatRoomResponse.builder()
                .id(r.getId())
                .neighborhoodId(r.getNeighborhoodId())
                .name(r.getName())
                .type(r.getType())
                .user1Id(r.getUser1Id())
                .user2Id(r.getUser2Id())
                .otherNickname(otherNickname)
                .lastMessage(r.getLastMessage())
                .lastMessageNickname(r.getLastMessageNickname())
                .lastMessageUserId(r.getLastMessageUserId())
                .lastMessageAt(r.getLastMessageAt())
                .memberCount(r.getMemberCount())
                .build();
    }
}
