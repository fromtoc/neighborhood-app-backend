package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.post.CreatePostRequest;
import com.example.app.dto.post.PostResponse;
import com.example.app.entity.Post;
import com.example.app.service.PostQueryService;
import com.example.app.service.SeoUrlService;
import com.example.app.service.WebRevalidateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.PostLike;
import com.example.app.mapper.PostLikeMapper;


@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Validated
@Tag(name = "Post", description = "社群貼文 API")
public class PostController {

    private final PostQueryService     postQueryService;
    private final SeoUrlService        seoUrlService;
    private final WebRevalidateService webRevalidateService;
    private final PostLikeMapper       postLikeMapper;

    @GetMapping
    @Operation(
            summary = "查詢指定里的貼文清單",
            description = "依建立時間倒序，支援類型過濾（general / info / shop_review / event）"
    )
    public ApiResponse<PageResult<PostResponse>> list(
            @Parameter(description = "里 ID", required = true, in = ParameterIn.QUERY)
            @RequestParam @NotNull Long neighborhoodId,

            @Parameter(description = "貼文類型（不傳 = 全部）", in = ParameterIn.QUERY)
            @RequestParam(required = false) String type,

            @Parameter(description = "頁碼（從 1 開始）", in = ParameterIn.QUERY)
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "每頁筆數（最大 50）", in = ParameterIn.QUERY)
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size
    ) {
        PageResult<PostResponse> result = postQueryService.listByNeighborhood(neighborhoodId, type, page, size);
        return ApiResponse.success(result);
    }

    @GetMapping("/mine")
    @Operation(summary = "查詢我的貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PageResult<PostResponse>> listMine(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        return ApiResponse.success(postQueryService.listByUser(claims.getUserId(), page, size));
    }

    @PostMapping
    @Operation(summary = "建立貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PostResponse> create(
            @AuthenticationPrincipal JwtClaims claims,
            @Valid @RequestBody CreatePostRequest req
    ) {
        if (claims == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        }
        String type = req.getType() != null ? req.getType() : "fresh";
        boolean isAdminType = "info".equals(type) || "broadcast".equals(type)
                || "district_info".equals(type) || "li_info".equals(type);
        if (isAdminType && claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只有管理員可以發布資訊/廣播");
        }
        Post post = postQueryService.create(claims.getUserId(), req);
        seoUrlService.upsertPost(post);                                          // async
        webRevalidateService.revalidatePaths(List.of("/posts/" + post.getId())); // async
        return ApiResponse.success(PostResponse.from(post));
    }

    @GetMapping("/likes/check-batch")
    @Operation(summary = "批次檢查已按讚的貼文ID", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<Long>> checkLikesBatch(
            @RequestParam List<Long> postIds,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (postIds == null || postIds.isEmpty()) return ApiResponse.success(List.of());
        List<PostLike> likes = postLikeMapper.selectList(
                new LambdaQueryWrapper<PostLike>()
                        .eq(PostLike::getUserId, claims.getUserId())
                        .in(PostLike::getPostId, postIds));
        List<Long> likedIds = likes.stream().map(PostLike::getPostId).toList();
        return ApiResponse.success(likedIds);
    }

    @GetMapping("/{id}")
    @Operation(summary = "依 ID 查詢單筆貼文")
    public ApiResponse<PostResponse> getById(
            @Parameter(description = "貼文 ID", required = true)
            @PathVariable Long id
    ) {
        PostResponse post = postQueryService.getById(id);
        if (post == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "貼文不存在");
        }
        return ApiResponse.success(post);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "編輯貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PostResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody java.util.Map<String, Object> body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        String content = (String) body.get("content");
        if (content == null || content.isBlank())
            throw new BusinessException(ResultCode.BAD_REQUEST, "內容不得為空");
        String title = (String) body.get("title");

        @SuppressWarnings("unchecked")
        java.util.List<String> images = (java.util.List<String>) body.get("images");

        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> extra = (java.util.Map<String, Object>) body.get("extra");

        String urgency = (String) body.get("urgency");

        return ApiResponse.success(
                postQueryService.updatePost(id, claims.getUserId(), claims.getRole(), title, content, images, extra, urgency));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "刪除貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        postQueryService.deletePost(id, claims.getUserId(), claims.getRole());
        return ApiResponse.success(null);
    }
}
