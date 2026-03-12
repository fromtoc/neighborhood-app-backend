package com.example.app.dto.follow;

import com.example.app.entity.Neighborhood;
import com.example.app.entity.UserNeighborhoodFollow;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FollowResponse {
    private Long id;
    private String name;
    private String city;
    private String district;
    @JsonProperty("isDefault")
    private boolean isDefault;
    private String alias;

    public static FollowResponse from(Neighborhood nh, UserNeighborhoodFollow follow) {
        return FollowResponse.builder()
                .id(nh.getId())
                .name(nh.getName())
                .city(nh.getCity())
                .district(nh.getDistrict())
                .isDefault(follow.getIsDefault() != null && follow.getIsDefault() == 1)
                .alias(follow.getAlias())
                .build();
    }
}
