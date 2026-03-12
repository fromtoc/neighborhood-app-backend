package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.entity.Post;
import com.example.app.entity.PostBookmark;
import com.example.app.entity.User;
import com.example.app.mapper.PostBookmarkMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
@Tag(name = "UserProfile", description = "個人資料")
public class UserProfileController {

    private final UserMapper userMapper;
    private final PostMapper postMapper;
    private final PostBookmarkMapper postBookmarkMapper;

    @GetMapping
    @Operation(summary = "取得個人資料（含貼文數、收藏數）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ProfileResponse> getProfile(
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        User user = userMapper.selectById(claims.getUserId());
        if (user == null) throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");

        long postCount = postMapper.selectCount(
                new LambdaQueryWrapper<Post>().eq(Post::getUserId, claims.getUserId())
        );
        long bookmarkCount = postBookmarkMapper.selectCount(
                new LambdaQueryWrapper<PostBookmark>().eq(PostBookmark::getUserId, claims.getUserId())
        );

        return ApiResponse.success(ProfileResponse.builder()
                .nickname(user.getNickname())
                .bio(user.getBio())
                .useAvatar(user.getUseAvatar() != null && user.getUseAvatar() == 1)
                .avatarUrl(user.getAvatarUrl())
                .postCount(postCount)
                .bookmarkCount(bookmarkCount)
                .build());
    }

    @PatchMapping("/nickname")
    @Operation(summary = "更新暱稱（第三方登入用戶）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Map<String, String>> updateNickname(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, String> body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (claims.getRole().name().equals("GUEST"))
            throw new BusinessException(ResultCode.FORBIDDEN, "訪客無法修改暱稱");

        String nickname = body.get("nickname");
        if (nickname == null || nickname.isBlank())
            throw new BusinessException(ResultCode.BAD_REQUEST, "暱稱不得為空");
        if (nickname.length() > 20)
            throw new BusinessException(ResultCode.BAD_REQUEST, "暱稱不得超過 20 字");

        userMapper.update(new LambdaUpdateWrapper<User>()
                .eq(User::getId, claims.getUserId())
                .set(User::getNickname, nickname.trim()));

        return ApiResponse.success(Map.of("nickname", nickname.trim()));
    }

    @PatchMapping("/profile")
    @Operation(summary = "更新個人資料（暱稱、自我介紹、是否顯示頭像）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ProfileResponse> updateProfile(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, Object> body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (claims.getRole().name().equals("GUEST"))
            throw new BusinessException(ResultCode.FORBIDDEN, "訪客無法編輯個人資料");

        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<User>()
                .eq(User::getId, claims.getUserId());

        if (body.containsKey("nickname")) {
            String nickname = (String) body.get("nickname");
            if (nickname == null || nickname.isBlank())
                throw new BusinessException(ResultCode.BAD_REQUEST, "暱稱不得為空");
            if (nickname.length() > 20)
                throw new BusinessException(ResultCode.BAD_REQUEST, "暱稱不得超過 20 字");
            wrapper.set(User::getNickname, nickname.trim());
        }

        if (body.containsKey("bio")) {
            String bio = (String) body.get("bio");
            if (bio != null && bio.length() > 100)
                throw new BusinessException(ResultCode.BAD_REQUEST, "自我介紹不得超過 100 字");
            wrapper.set(User::getBio, bio != null && bio.isBlank() ? null : (bio != null ? bio.trim() : null));
        }

        if (body.containsKey("useAvatar")) {
            Boolean useAvatar = (Boolean) body.get("useAvatar");
            wrapper.set(User::getUseAvatar, useAvatar != null && useAvatar ? 1 : 0);
        }

        userMapper.update(wrapper);

        // Return updated profile
        return getProfile(claims);
    }

    @Getter
    @Builder
    public static class ProfileResponse {
        private String nickname;
        private String bio;
        private boolean useAvatar;
        private String avatarUrl;
        private long postCount;
        private long bookmarkCount;
    }
}
