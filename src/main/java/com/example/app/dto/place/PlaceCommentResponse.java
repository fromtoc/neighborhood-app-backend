package com.example.app.dto.place;

import com.example.app.entity.PlaceComment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PlaceCommentResponse {
    private Long id;
    private Long placeId;
    private Long userId;
    private String authorName;
    private String content;
    private Integer rating;
    private Integer likeCount;
    private LocalDateTime createdAt;

    public static PlaceCommentResponse from(PlaceComment c, String authorName) {
        return PlaceCommentResponse.builder()
                .id(c.getId())
                .placeId(c.getPlaceId())
                .userId(c.getUserId())
                .authorName(authorName)
                .content(c.getContent())
                .rating(c.getRating())
                .likeCount(c.getLikeCount())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
