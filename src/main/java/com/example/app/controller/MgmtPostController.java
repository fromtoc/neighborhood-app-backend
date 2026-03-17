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
import com.example.app.entity.Post;
import com.example.app.entity.User;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/mgmt/posts")
@RequiredArgsConstructor
@Validated
@Tag(name = "Management - Posts", description = "後台貼文管理 API")
public class MgmtPostController {

    private final PostMapper postMapper;
    private final UserMapper userMapper;

    // ── DTOs ──────────────────────────────────────────────

    public record AdminPostResponse(
            Long id,
            String title,
            String content,
            String type,
            String scope,
            String urgency,
            Integer status,
            Integer likeCount,
            Integer commentCount,
            Long userId,
            String nickname,
            Long neighborhoodId,
            LocalDateTime createdAt
    ) {}

    // ── Endpoints ──────────────────────────────────────────

    @GetMapping
    @Operation(summary = "查詢貼文列表（管理員）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PageResult<AdminPostResponse>> list(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        requireAdmin(claims);

        LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Post::getTitle, keyword).or().like(Post::getContent, keyword));
        }
        if (StringUtils.hasText(type)) {
            wrapper.eq(Post::getType, type);
        }
        if (status != null) {
            wrapper.eq(Post::getStatus, status);
        }
        wrapper.orderByDesc(Post::getCreatedAt);

        IPage<Post> postPage = postMapper.selectPage(new Page<>(page, size), wrapper);

        // Collect user IDs and batch-fetch nicknames
        List<Long> userIds = postPage.getRecords().stream()
                .map(Post::getUserId)
                .distinct()
                .toList();

        Map<Long, String> nicknameMap = Map.of();
        if (!userIds.isEmpty()) {
            nicknameMap = userMapper.selectBatchIds(userIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u.getNickname() != null ? u.getNickname() : "", (a, b) -> a));
        }

        Map<Long, String> finalNicknameMap = nicknameMap;
        List<AdminPostResponse> records = postPage.getRecords().stream()
                .map(p -> new AdminPostResponse(
                        p.getId(),
                        p.getTitle(),
                        truncate(p.getContent(), 100),
                        p.getType(),
                        p.getScope(),
                        p.getUrgency(),
                        p.getStatus(),
                        p.getLikeCount(),
                        p.getCommentCount(),
                        p.getUserId(),
                        finalNicknameMap.getOrDefault(p.getUserId(), ""),
                        p.getNeighborhoodId(),
                        p.getCreatedAt()
                ))
                .toList();

        return ApiResponse.success(new PageResult<>(postPage.getTotal(), records));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "隱藏/顯示貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> updateStatus(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id,
            @RequestParam int value
    ) {
        requireAdmin(claims);
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "貼文不存在");
        }
        post.setStatus(value);
        postMapper.updateById(post);
        return ApiResponse.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "刪除貼文（軟刪除）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id
    ) {
        requireAdmin(claims);
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "貼文不存在");
        }
        postMapper.deleteById(id);
        return ApiResponse.success();
    }

    // ── helpers ──────────────────────────────────────────────

    private void requireAdmin(JwtClaims claims) {
        if (claims == null ||
                (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
