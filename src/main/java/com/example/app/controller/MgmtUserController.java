package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.mgmt.AdminUserResponse;
import com.example.app.service.MgmtUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/mgmt/users")
@RequiredArgsConstructor
@Validated
@Tag(name = "Management", description = "後台用戶管理 API")
public class MgmtUserController {

    private final MgmtUserService mgmtUserService;

    @GetMapping
    @Operation(summary = "查詢用戶列表（管理員以上）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PageResult<AdminUserResponse>> list(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String provider,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        requireAdmin(claims);
        return ApiResponse.success(mgmtUserService.listUsers(id, keyword, provider, page, size));
    }

    @PatchMapping("/{id}/admin")
    @Operation(summary = "設定/取消管理員（超級管理員限定）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<AdminUserResponse> setAdmin(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id,
            @RequestParam boolean value
    ) {
        requireSuperAdmin(claims);
        if (claims.getUserId().equals(id)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "無法修改自己的角色");
        }
        return ApiResponse.success(mgmtUserService.setAdmin(id, value));
    }

    // ── helpers ──────────────────────────────────────────────

    private void requireAdmin(JwtClaims claims) {
        if (claims == null ||
                (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
        }
    }

    private void requireSuperAdmin(JwtClaims claims) {
        if (claims == null || claims.getRole() != UserRole.SUPER_ADMIN) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要超級管理員權限");
        }
    }
}
