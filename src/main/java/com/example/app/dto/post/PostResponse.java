package com.example.app.dto.post;

import com.example.app.entity.Post;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PostResponse {

    private Long id;
    private Long neighborhoodId;
    private Long userId;
    private String authorName;
    private String authorRole;
    private String title;
    private String content;
    private List<String> images;
    private String type;
    private String urgency;
    private Long placeId;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createdAt;

    public static PostResponse from(Post p) {
        return from(p, null);
    }

    public static PostResponse from(Post p, String authorName) {
        return from(p, authorName, null);
    }

    public static PostResponse from(Post p, String authorName, String authorRole) {
        return PostResponse.builder()
                .id(p.getId())
                .neighborhoodId(p.getNeighborhoodId())
                .userId(p.getUserId())
                .authorName(authorName)
                .authorRole(authorRole)
                .title(p.getTitle())
                .content(p.getContent())
                .images(parseImages(p.getImagesJson()))
                .type(p.getType())
                .urgency(p.getUrgency())
                .placeId(p.getPlaceId())
                .likeCount(p.getLikeCount())
                .commentCount(p.getCommentCount())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private static List<String> parseImages(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return List.of();
        // Strip brackets and quotes — lightweight parse without Jackson dependency in DTO
        String trimmed = json.replaceAll("^\\[|\\]$", "").trim();
        if (trimmed.isEmpty()) return List.of();
        return List.of(trimmed.split(",\\s*"))
                .stream()
                .map(s -> s.replaceAll("^\"|\"$", ""))
                .toList();
    }
}
