package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.mapper.MgmtAnalyticsMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mgmt")
@RequiredArgsConstructor
@Validated
@Tag(name = "Management - Dashboard", description = "後台儀表板與分析 API")
public class MgmtDashboardController {

    private final MgmtAnalyticsMapper analyticsMapper;

    // ── DTOs ──────────────────────────────────────────────

    public record DashboardStats(
            long totalUsers,
            long totalGuests,
            long totalPosts,
            long totalPlaces,
            long totalNeighborhoods,
            long todayNewUsers,
            long todayNewPosts,
            long weekActiveUsers
    ) {}

    public record DateCount(String date, long count) {}
    public record LabelCount(String label, long count) {}

    // ── Endpoints ──────────────────────────────────────────

    @GetMapping("/dashboard")
    @Operation(summary = "後台總覽統計", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<DashboardStats> dashboard(@AuthenticationPrincipal JwtClaims claims) {
        requireAdmin(claims);
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(7);

        DashboardStats stats = new DashboardStats(
                analyticsMapper.countTotalUsers(),
                analyticsMapper.countTotalGuests(),
                analyticsMapper.countTotalPosts(),
                analyticsMapper.countTotalPlaces(),
                analyticsMapper.countTotalNeighborhoods(),
                analyticsMapper.countTodayNewUsers(today),
                analyticsMapper.countTodayNewPosts(today),
                analyticsMapper.countWeekActiveUsers(weekAgo)
        );
        return ApiResponse.success(stats);
    }

    @GetMapping("/analytics/user-growth")
    @Operation(summary = "每日新增用戶趨勢", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<DateCount>> userGrowth(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days
    ) {
        requireAdmin(claims);
        LocalDate since = LocalDate.now().minusDays(days);
        List<DateCount> result = analyticsMapper.dailyNewUsers(since).stream()
                .map(m -> new DateCount(String.valueOf(m.get("date")), ((Number) m.get("count")).longValue()))
                .toList();
        return ApiResponse.success(result);
    }

    @GetMapping("/analytics/post-activity")
    @Operation(summary = "每日新增貼文趨勢", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<DateCount>> postActivity(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days
    ) {
        requireAdmin(claims);
        LocalDate since = LocalDate.now().minusDays(days);
        List<DateCount> result = analyticsMapper.dailyNewPosts(since).stream()
                .map(m -> new DateCount(String.valueOf(m.get("date")), ((Number) m.get("count")).longValue()))
                .toList();
        return ApiResponse.success(result);
    }

    @GetMapping("/analytics/user-providers")
    @Operation(summary = "用戶登入方式分佈", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<LabelCount>> userProviders(@AuthenticationPrincipal JwtClaims claims) {
        requireAdmin(claims);
        List<LabelCount> result = analyticsMapper.providerDistribution().stream()
                .map(m -> new LabelCount(String.valueOf(m.get("provider")), ((Number) m.get("count")).longValue()))
                .toList();
        return ApiResponse.success(result);
    }

    @GetMapping("/analytics/post-types")
    @Operation(summary = "貼文類型分佈", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<LabelCount>> postTypes(@AuthenticationPrincipal JwtClaims claims) {
        requireAdmin(claims);
        List<LabelCount> result = analyticsMapper.postTypeDistribution().stream()
                .map(m -> new LabelCount(String.valueOf(m.get("type")), ((Number) m.get("count")).longValue()))
                .toList();
        return ApiResponse.success(result);
    }

    // ── helpers ──────────────────────────────────────────────

    private void requireAdmin(JwtClaims claims) {
        if (claims == null ||
                (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
        }
    }
}
