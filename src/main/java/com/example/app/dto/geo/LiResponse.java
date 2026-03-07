package com.example.app.dto.geo;

import com.example.app.entity.Neighborhood;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class LiResponse {

    private Long id;
    private String city;
    private String district;
    private String name;
    private BigDecimal lat;
    private BigDecimal lng;
    private Integer status;

    public static LiResponse from(Neighborhood n) {
        return LiResponse.builder()
                .id(n.getId())
                .city(n.getCity())
                .district(n.getDistrict())
                .name(n.getName())
                .lat(n.getLat())   // BigDecimal, nullable
                .lng(n.getLng())
                .status(n.getStatus())
                .build();
    }
}
