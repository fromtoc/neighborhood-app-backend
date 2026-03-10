package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.entity.Neighborhood;
import com.example.app.service.NeighborhoodFollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/follows")
@RequiredArgsConstructor
public class NeighborhoodFollowController {

    private final NeighborhoodFollowService followService;

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> getFollowing(
            @AuthenticationPrincipal JwtClaims claims) {
        List<Neighborhood> list = followService.getFollowing(claims.getUserId());
        List<Map<String, Object>> result = list.stream()
                .map(nh -> Map.<String, Object>of(
                        "id",       nh.getId(),
                        "name",     nh.getName(),
                        "city",     nh.getCity(),
                        "district", nh.getDistrict()
                ))
                .toList();
        return ApiResponse.success(result);
    }

    @PostMapping("/{neighborhoodId}")
    public ApiResponse<Void> follow(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long neighborhoodId) {
        if (UserRole.GUEST == claims.getRole())
            throw new BusinessException(ResultCode.FORBIDDEN, "訪客無法關注里");
        followService.follow(claims.getUserId(), neighborhoodId);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{neighborhoodId}")
    public ApiResponse<Void> unfollow(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long neighborhoodId) {
        followService.unfollow(claims.getUserId(), neighborhoodId);
        return ApiResponse.success(null);
    }
}
