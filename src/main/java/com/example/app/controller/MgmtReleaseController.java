package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.entity.AppRelease;
import com.example.app.mapper.AppReleaseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequiredArgsConstructor
@Validated
@Tag(name = "Management - Releases", description = "後台版本管理 API")
public class MgmtReleaseController {

    private final AppReleaseMapper appReleaseMapper;

    // ── DTOs ──────────────────────────────────────────────

    public record CreateReleaseRequest(
            @NotBlank String version,
            String platform,
            @NotBlank String title,
            String content,
            String downloadUrl,
            Integer isForce
    ) {}

    public record UpdateReleaseRequest(
            String version,
            String platform,
            String title,
            String content,
            String downloadUrl,
            Integer isForce
    ) {}

    public record ReleaseResponse(
            Long id,
            String version,
            String platform,
            String title,
            String content,
            String downloadUrl,
            Integer isForce,
            Integer isPublished,
            LocalDateTime publishedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    // ── Mgmt Endpoints ──────────────────────────────────────

    @GetMapping("/api/v1/mgmt/releases")
    @Operation(summary = "版本列表（管理員）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PageResult<ReleaseResponse>> list(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        requireAdmin(claims);
        LambdaQueryWrapper<AppRelease> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(AppRelease::getCreatedAt);
        IPage<AppRelease> result = appReleaseMapper.selectPage(new Page<>(page, size), wrapper);
        var records = result.getRecords().stream().map(this::toResponse).toList();
        return ApiResponse.success(new PageResult<>(result.getTotal(), records));
    }

    @PostMapping("/api/v1/mgmt/releases")
    @Operation(summary = "新增版本", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ReleaseResponse> create(
            @AuthenticationPrincipal JwtClaims claims,
            @Valid @RequestBody CreateReleaseRequest req
    ) {
        requireAdmin(claims);
        AppRelease entity = new AppRelease();
        entity.setVersion(req.version());
        entity.setPlatform(req.platform() != null ? req.platform() : "all");
        entity.setTitle(req.title());
        entity.setContent(req.content());
        entity.setDownloadUrl(req.downloadUrl());
        entity.setIsForce(req.isForce() != null ? req.isForce() : 0);
        entity.setIsPublished(0);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        appReleaseMapper.insert(entity);
        return ApiResponse.success(toResponse(entity));
    }

    @PutMapping("/api/v1/mgmt/releases/{id}")
    @Operation(summary = "更新版本", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ReleaseResponse> update(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id,
            @Valid @RequestBody UpdateReleaseRequest req
    ) {
        requireAdmin(claims);
        AppRelease entity = appReleaseMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "版本不存在");
        }
        if (StringUtils.hasText(req.version())) entity.setVersion(req.version());
        if (StringUtils.hasText(req.platform())) entity.setPlatform(req.platform());
        if (StringUtils.hasText(req.title())) entity.setTitle(req.title());
        if (req.content() != null) entity.setContent(req.content());
        if (req.downloadUrl() != null) entity.setDownloadUrl(req.downloadUrl());
        if (req.isForce() != null) entity.setIsForce(req.isForce());
        appReleaseMapper.updateById(entity);
        return ApiResponse.success(toResponse(entity));
    }

    @PutMapping("/api/v1/mgmt/releases/{id}/publish")
    @Operation(summary = "發佈/取消發佈版本", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ReleaseResponse> publish(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean value
    ) {
        requireAdmin(claims);
        AppRelease entity = appReleaseMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "版本不存在");
        }
        entity.setIsPublished(value ? 1 : 0);
        entity.setPublishedAt(value ? LocalDateTime.now() : null);
        appReleaseMapper.updateById(entity);
        return ApiResponse.success(toResponse(entity));
    }

    @DeleteMapping("/api/v1/mgmt/releases/{id}")
    @Operation(summary = "刪除版本（軟刪除）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id
    ) {
        requireAdmin(claims);
        AppRelease entity = appReleaseMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "版本不存在");
        }
        appReleaseMapper.deleteById(id);
        return ApiResponse.success();
    }

    // ── Public Endpoint ──────────────────────────────────────

    @GetMapping("/api/v1/releases/latest")
    @Operation(summary = "取得最新已發佈版本（公開）")
    public ApiResponse<ReleaseResponse> latest(
            @RequestParam(defaultValue = "all") String platform
    ) {
        LambdaQueryWrapper<AppRelease> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AppRelease::getIsPublished, 1);
        wrapper.and(w -> w.eq(AppRelease::getPlatform, platform).or().eq(AppRelease::getPlatform, "all"));
        wrapper.orderByDesc(AppRelease::getPublishedAt);
        wrapper.last("LIMIT 1");

        AppRelease release = appReleaseMapper.selectOne(wrapper);
        if (release == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "尚無已發佈版本");
        }
        return ApiResponse.success(toResponse(release));
    }

    // ── helpers ──────────────────────────────────────────────

    private ReleaseResponse toResponse(AppRelease e) {
        return new ReleaseResponse(
                e.getId(), e.getVersion(), e.getPlatform(), e.getTitle(),
                e.getContent(), e.getDownloadUrl(), e.getIsForce(),
                e.getIsPublished(), e.getPublishedAt(),
                e.getCreatedAt(), e.getUpdatedAt()
        );
    }

    private void requireAdmin(JwtClaims claims) {
        if (claims == null ||
                (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
        }
    }
}
