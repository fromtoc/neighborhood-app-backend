package com.example.app.dto.place;

import com.example.app.entity.Place;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class PlaceResponse {

    private Long id;
    private Long neighborhoodId;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String website;
    private String hours;
    private BigDecimal lat;
    private BigDecimal lng;
    private String coverImageUrl;
    private List<String> images;
    private List<String> tags;
    private BigDecimal rating;
    private Integer reviewCount;
    private Integer likeCount;
    private Boolean hasHomeService;
    private Boolean isPartner;
    private Integer status;

    public static PlaceResponse from(Place p) {
        return PlaceResponse.builder()
                .id(p.getId())
                .neighborhoodId(p.getNeighborhoodId())
                .categoryId(p.getCategoryId())
                .categoryName(p.getCategoryName())
                .name(p.getName())
                .description(p.getDescription())
                .address(p.getAddress())
                .phone(p.getPhone())
                .website(p.getWebsite())
                .hours(p.getHours())
                .lat(p.getLat())
                .lng(p.getLng())
                .coverImageUrl(p.getCoverImageUrl())
                .images(parseJsonArray(p.getImagesJson()))
                .tags(parseJsonArray(p.getTagsJson()))
                .rating(p.getRating())
                .reviewCount(p.getReviewCount())
                .likeCount(p.getLikeCount())
                .hasHomeService(Integer.valueOf(1).equals(p.getHasHomeService()))
                .isPartner(Integer.valueOf(1).equals(p.getIsPartner()))
                .status(p.getStatus())
                .build();
    }

    private static List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return List.of();
        String trimmed = json.replaceAll("^\\[|\\]$", "").trim();
        if (trimmed.isEmpty()) return List.of();
        return List.of(trimmed.split(",\\s*"))
                .stream()
                .map(s -> s.replaceAll("^\"|\"$", ""))
                .toList();
    }
}
