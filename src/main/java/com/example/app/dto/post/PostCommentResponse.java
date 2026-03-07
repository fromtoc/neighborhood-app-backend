package com.example.app.dto.post;

import com.example.app.entity.PostComment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PostCommentResponse {

    private Long id;
    private Long postId;
    private Long userId;
    private String nickname;
    private String content;
    private LocalDateTime createdAt;

    public static PostCommentResponse from(PostComment c) {
        return from(c, c.getNickname());
    }

    public static PostCommentResponse from(PostComment c, String nickname) {
        return PostCommentResponse.builder()
                .id(c.getId())
                .postId(c.getPostId())
                .userId(c.getUserId())
                .nickname(nickname)
                .content(c.getContent())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
