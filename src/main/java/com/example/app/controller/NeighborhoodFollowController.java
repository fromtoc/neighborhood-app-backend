package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.follow.FollowListResponse;
import com.example.app.dto.follow.UpdateAliasRequest;
import com.example.app.service.NeighborhoodFollowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/follows")
@RequiredArgsConstructor
public class NeighborhoodFollowController {

    private final NeighborhoodFollowService followService;

    @GetMapping
    public ApiResponse<FollowListResponse> getFollowing(
            @AuthenticationPrincipal JwtClaims claims) {
        return ApiResponse.success(followService.getFollowing(claims.getUserId()));
    }

    @PostMapping("/{neighborhoodId}")
    public ApiResponse<Void> follow(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long neighborhoodId) {
        requireNonGuest(claims);
        followService.follow(claims.getUserId(), neighborhoodId);
        return ApiResponse.success(null);
    }

    @DeleteMapping("/{neighborhoodId}")
    public ApiResponse<Void> unfollow(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long neighborhoodId) {
        requireNonGuest(claims);
        followService.unfollow(claims.getUserId(), neighborhoodId);
        return ApiResponse.success(null);
    }

    @PutMapping("/{neighborhoodId}/default")
    public ApiResponse<Void> setDefault(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long neighborhoodId) {
        requireNonGuest(claims);
        followService.setDefault(claims.getUserId(), neighborhoodId);
        return ApiResponse.success(null);
    }

    @PatchMapping("/{neighborhoodId}/alias")
    public ApiResponse<Void> updateAlias(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long neighborhoodId,
            @Valid @RequestBody UpdateAliasRequest request) {
        requireNonGuest(claims);
        followService.updateAlias(claims.getUserId(), neighborhoodId, request.getAlias());
        return ApiResponse.success(null);
    }

    private void requireNonGuest(JwtClaims claims) {
        if (UserRole.GUEST == claims.getRole()) {
            throw new BusinessException(ResultCode.FORBIDDEN, "訪客無法執行此操作");
        }
    }
}
