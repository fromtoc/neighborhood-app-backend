package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.entity.LiChief;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.User;
import com.example.app.entity.UserIdentity;
import com.example.app.mapper.LiChiefMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserIdentityMapper;
import com.example.app.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/mgmt/li-chiefs")
@RequiredArgsConstructor
@Tag(name = "Management - Li Chief", description = "里長管理 API")
public class MgmtLiChiefController {

    private final LiChiefMapper liChiefMapper;
    private final UserMapper userMapper;
    private final UserIdentityMapper userIdentityMapper;
    private final NeighborhoodMapper neighborhoodMapper;

    record AssignRequest(Long userId, Long neighborhoodId) {}

    record LiChiefResponse(Long id, Long userId, String nickname, Long neighborhoodId,
                           String neighborhoodName, String city, String district,
                           LocalDateTime createdAt) {}

    @GetMapping
    @Operation(summary = "里長列表", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<LiChiefResponse>> list(@AuthenticationPrincipal JwtClaims claims) {
        requireAdmin(claims);
        List<LiChief> chiefs = liChiefMapper.selectList(new LambdaQueryWrapper<>());
        List<LiChiefResponse> responses = chiefs.stream().map(this::toResponse).toList();
        return ApiResponse.success(responses);
    }

    @PutMapping
    @Operation(summary = "指派里長", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<LiChiefResponse> assign(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody AssignRequest req) {
        requireAdmin(claims);

        // 驗證用戶存在且為第三方登入
        User user = userMapper.selectById(req.userId());
        if (user == null) throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");
        if (Integer.valueOf(1).equals(user.getIsGuest()))
            throw new BusinessException(ResultCode.BAD_REQUEST, "訪客不能被指派為里長");
        Long identityCount = userIdentityMapper.selectCount(
                new LambdaQueryWrapper<UserIdentity>().eq(UserIdentity::getUserId, req.userId()));
        if (identityCount == 0)
            throw new BusinessException(ResultCode.BAD_REQUEST, "只有第三方登入的用戶可以被指派為里長");

        // 驗證里存在
        Neighborhood nh = neighborhoodMapper.selectById(req.neighborhoodId());
        if (nh == null) throw new BusinessException(ResultCode.NOT_FOUND, "里不存在");

        // 移除該用戶之前的里長指派（如果有）
        liChiefMapper.delete(
                new LambdaQueryWrapper<LiChief>().eq(LiChief::getUserId, req.userId()));
        // 移除該里之前的里長（如果有）
        liChiefMapper.delete(
                new LambdaQueryWrapper<LiChief>().eq(LiChief::getNeighborhoodId, req.neighborhoodId()));

        LiChief chief = new LiChief();
        chief.setUserId(req.userId());
        chief.setNeighborhoodId(req.neighborhoodId());
        chief.setCreatedAt(LocalDateTime.now());
        chief.setUpdatedAt(LocalDateTime.now());
        liChiefMapper.insert(chief);

        return ApiResponse.success(toResponse(chief));
    }

    @DeleteMapping("/{userId}")
    @Operation(summary = "撤銷里長", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> revoke(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long userId) {
        requireAdmin(claims);
        liChiefMapper.delete(
                new LambdaQueryWrapper<LiChief>().eq(LiChief::getUserId, userId));
        return ApiResponse.success(null);
    }

    private LiChiefResponse toResponse(LiChief chief) {
        User u = userMapper.selectById(chief.getUserId());
        Neighborhood nh = neighborhoodMapper.selectById(chief.getNeighborhoodId());
        return new LiChiefResponse(
                chief.getId(),
                chief.getUserId(),
                u != null ? u.getNickname() : null,
                chief.getNeighborhoodId(),
                nh != null ? nh.getName() : null,
                nh != null ? nh.getCity() : null,
                nh != null ? nh.getDistrict() : null,
                chief.getCreatedAt()
        );
    }

    private void requireAdmin(JwtClaims claims) {
        if (claims == null ||
                (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN))
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
    }
}
