package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.entity.User;
import com.example.app.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
}
