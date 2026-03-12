package com.example.app.dto.follow;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class FollowListResponse {
    private List<FollowResponse> follows;
    private int cooldownSlots;
    private LocalDateTime cooldownExpiredAt;
}
