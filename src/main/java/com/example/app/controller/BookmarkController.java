package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.post.PostResponse;
import com.example.app.entity.Post;
import com.example.app.entity.PostBookmark;
import com.example.app.entity.User;
import com.example.app.mapper.PostBookmarkMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/bookmarks")
@RequiredArgsConstructor
@Tag(name = "Bookmark", description = "貼文收藏")
public class BookmarkController {

    private final PostBookmarkMapper bookmarkMapper;
    private final PostMapper postMapper;
    private final UserMapper userMapper;

    @PostMapping("/{postId}")
    @Operation(summary = "收藏/取消收藏貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Map<String, Object>> toggle(
            @PathVariable Long postId,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");

        PostBookmark existing = bookmarkMapper.selectOne(
                new LambdaQueryWrapper<PostBookmark>()
                        .eq(PostBookmark::getUserId, claims.getUserId())
                        .eq(PostBookmark::getPostId, postId));

        boolean bookmarked;
        if (existing != null) {
            bookmarkMapper.deleteById(existing.getId());
            bookmarked = false;
        } else {
            PostBookmark bm = new PostBookmark();
            bm.setUserId(claims.getUserId());
            bm.setPostId(postId);
            bookmarkMapper.insert(bm);
            bookmarked = true;
        }
        return ApiResponse.success(Map.of("bookmarked", bookmarked));
    }

    @GetMapping
    @Operation(summary = "查詢我的收藏列表", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<PostResponse>> list(
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");

        List<PostBookmark> bookmarks = bookmarkMapper.selectList(
                new LambdaQueryWrapper<PostBookmark>()
                        .eq(PostBookmark::getUserId, claims.getUserId())
                        .orderByDesc(PostBookmark::getCreatedAt));

        if (bookmarks.isEmpty()) return ApiResponse.success(List.of());

        List<Long> postIds = bookmarks.stream().map(PostBookmark::getPostId).toList();
        List<Post> posts = postMapper.selectBatchIds(postIds);

        // Batch load users
        Map<Long, User> userMap = Map.of();
        if (!posts.isEmpty()) {
            List<Long> userIds = posts.stream().map(Post::getUserId).distinct().toList();
            userMap = userMapper.selectBatchIds(userIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u));
        }

        // Maintain bookmark order
        Map<Long, Post> postMap = posts.stream().collect(Collectors.toMap(Post::getId, p -> p));
        Map<Long, User> finalUserMap = userMap;
        List<PostResponse> responses = postIds.stream()
                .map(postMap::get)
                .filter(p -> p != null)
                .map(p -> {
                    User u = finalUserMap.get(p.getUserId());
                    String name = u != null ? (u.getNickname() != null ? u.getNickname() : "里民 #" + u.getId()) : null;
                    String role = u != null ? resolveRole(u) : null;
                    return PostResponse.from(p, name, role);
                })
                .toList();

        return ApiResponse.success(responses);
    }

    @GetMapping("/check")
    @Operation(summary = "檢查是否已收藏指定貼文", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Map<String, Boolean>> check(
            @RequestParam Long postId,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        Long count = bookmarkMapper.selectCount(
                new LambdaQueryWrapper<PostBookmark>()
                        .eq(PostBookmark::getUserId, claims.getUserId())
                        .eq(PostBookmark::getPostId, postId));
        return ApiResponse.success(Map.of("bookmarked", count > 0));
    }

    @GetMapping("/check-batch")
    @Operation(summary = "批次檢查已收藏的貼文ID", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<Long>> checkBatch(
            @RequestParam List<Long> postIds,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (postIds == null || postIds.isEmpty()) return ApiResponse.success(List.of());
        List<PostBookmark> bookmarks = bookmarkMapper.selectList(
                new LambdaQueryWrapper<PostBookmark>()
                        .eq(PostBookmark::getUserId, claims.getUserId())
                        .in(PostBookmark::getPostId, postIds));
        List<Long> bookmarkedIds = bookmarks.stream().map(PostBookmark::getPostId).toList();
        return ApiResponse.success(bookmarkedIds);
    }

    private static String resolveRole(User u) {
        if (Integer.valueOf(1).equals(u.getIsSuperAdmin())) return "SUPER_ADMIN";
        if (Integer.valueOf(1).equals(u.getIsAdmin())) return "ADMIN";
        if (Integer.valueOf(1).equals(u.getIsGuest())) return "GUEST";
        return "USER";
    }
}
