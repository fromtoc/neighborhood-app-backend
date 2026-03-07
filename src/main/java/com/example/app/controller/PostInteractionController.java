package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.post.PostCommentResponse;
import com.example.app.dto.post.PostLikeResponse;
import com.example.app.service.PostInteractionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/posts/{postId}")
@RequiredArgsConstructor
@Validated
@Tag(name = "PostInteraction", description = "貼文按讚 / 留言")
public class PostInteractionController {

    private final PostInteractionService interactionService;

    /* ── 按讚 ─────────────────────────────────────────── */

    @PostMapping("/like")
    @Operation(summary = "切換按讚狀態（需登入）",
               security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PostLikeResponse> toggleLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        return ApiResponse.success(interactionService.toggleLike(postId, claims.getUserId()));
    }

    /* ── 留言 ─────────────────────────────────────────── */

    @GetMapping("/comments")
    @Operation(summary = "取得貼文留言列表")
    public ApiResponse<List<PostCommentResponse>> listComments(@PathVariable Long postId) {
        return ApiResponse.success(interactionService.listComments(postId));
    }

    @PostMapping("/comments")
    @Operation(summary = "新增留言（需登入）",
               security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PostCommentResponse> addComment(
            @PathVariable Long postId,
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, String> body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new BusinessException(ResultCode.BAD_REQUEST, "留言內容不得為空");
        if (content.length() > 500)
            content = content.substring(0, 500);
        return ApiResponse.success(
                interactionService.addComment(postId, claims.getUserId(), content));
    }
}
