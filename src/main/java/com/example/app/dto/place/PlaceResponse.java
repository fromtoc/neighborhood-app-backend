package com.example.app.dto.place;

import com.example.app.entity.Place;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class PlaceResponse {

    private Long id;
    private Long neighborhoodId;
    private Long categoryId;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String website;
    private String hours;
    private BigDecimal lat;
    private BigDecimal lng;
    private String coverImageUrl;
    private Integer status;

    public static PlaceResponse from(Place p) {
        return PlaceResponse.builder()
                .id(p.getId())
                .neighborhoodId(p.getNeighborhoodId())
                .categoryId(p.getCategoryId())
                .name(p.getName())
                .description(p.getDescription())
                .address(p.getAddress())
                .phone(p.getPhone())
                .website(p.getWebsite())
                .hours(p.getHours())
                .lat(p.getLat())
                .lng(p.getLng())
                .coverImageUrl(p.getCoverImageUrl())
                .status(p.getStatus())
                .build();
    }
}
