package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.post.PostResponse;
import com.example.app.entity.*;
import com.example.app.mapper.*;
import com.example.app.service.PostQueryService;
import java.util.HashMap;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Profile", description = "用戶公開資料 & 追蹤")
public class UserProfileController {

    private final UserMapper userMapper;
    private final UserFollowMapper userFollowMapper;
    private final UserNeighborhoodFollowMapper userNeighborhoodFollowMapper;
    private final PostMapper postMapper;
    private final PostBookmarkMapper postBookmarkMapper;
    private final LiChiefMapper liChiefMapper;
    private final NeighborhoodMapper neighborhoodMapper;
    private final PostQueryService postQueryService;

    record UserProfileResponse(
            Long id,
            String nickname,
            String avatarUrl,
            String bio,
            String role,
            String badge,
            Long postCount,
            Long followingCount,
            Long followerCount,
            Boolean isFollowed,
            LocalDateTime createdAt
    ) {}

    // ── @ Mention 候選人搜尋 ──────────────────────────────────

    record MentionCandidate(Long id, String nickname, String avatarUrl, String badge) {}

    @GetMapping("/mention-candidates")
    @Operation(summary = "搜尋可 @ 的用戶", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<java.util.List<MentionCandidate>> mentionCandidates(
            @RequestParam String keyword,
            @RequestParam Long neighborhoodId,
            @RequestParam(defaultValue = "li") String scope,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (keyword == null) keyword = "";

        // 1. 取得範圍內的所有 neighborhoodIds
        java.util.List<Long> nhIds;
        if ("district".equals(scope)) {
            Neighborhood nh = neighborhoodMapper.selectById(neighborhoodId);
            if (nh == null) return ApiResponse.success(java.util.List.of());
            nhIds = neighborhoodMapper.selectList(
                    new LambdaQueryWrapper<Neighborhood>()
                            .eq(Neighborhood::getCity, nh.getCity())
                            .eq(Neighborhood::getDistrict, nh.getDistrict())
                            .eq(Neighborhood::getStatus, 1)
                            .select(Neighborhood::getId)
            ).stream().map(Neighborhood::getId).toList();
        } else {
            nhIds = java.util.List.of(neighborhoodId);
        }

        // 2. 從 user_neighborhood_follow 找關注這些里的用戶
        java.util.List<Long> followerUserIds = userNeighborhoodFollowMapper.selectList(
                new LambdaQueryWrapper<UserNeighborhoodFollow>()
                        .in(UserNeighborhoodFollow::getNeighborhoodId, nhIds)
                        .select(UserNeighborhoodFollow::getUserId)
        ).stream().map(UserNeighborhoodFollow::getUserId).distinct().toList();

        if (followerUserIds.isEmpty()) return ApiResponse.success(java.util.List.of());

        // 3. 搜尋 nickname 符合的用戶（排除自己）
        LambdaQueryWrapper<User> userWrapper = new LambdaQueryWrapper<User>()
                .in(User::getId, followerUserIds)
                .ne(User::getId, claims.getUserId());
        if (!keyword.isBlank()) {
            userWrapper.like(User::getNickname, keyword);
        }
        userWrapper.last("LIMIT 10");
        java.util.List<User> users = userMapper.selectList(userWrapper);

        // 4. 批次查 badge
        java.util.Map<Long, String> badgeMap = new java.util.HashMap<>();
        try {
            java.util.List<Long> uids = users.stream().map(User::getId).toList();
            if (!uids.isEmpty()) {
                java.util.List<LiChief> chiefs = liChiefMapper.selectList(
                        new LambdaQueryWrapper<LiChief>().in(LiChief::getUserId, uids));
                for (LiChief c : chiefs) {
                    Neighborhood nh = neighborhoodMapper.selectById(c.getNeighborhoodId());
                    badgeMap.put(c.getUserId(), nh != null ? nh.getName() + "里長" : "里長");
                }
            }
        } catch (Exception ignored) {}

        java.util.List<MentionCandidate> candidates = users.stream().map(u ->
                new MentionCandidate(u.getId(), u.getNickname(), u.getAvatarUrl(), badgeMap.get(u.getId()))
        ).toList();

        return ApiResponse.success(candidates);
    }

    // ── 個人資料 ──────────────────────────────────────────────

    record MyProfileResponse(
            String nickname,
            String bio,
            Boolean useAvatar,
            String avatarUrl,
            String role,
            String badge,
            Long postCount,
            Long bookmarkCount,
            Long followerCount,
            Long followingCount
    ) {}

    @GetMapping("/me")
    @Operation(summary = "取得自己的資料", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<MyProfileResponse> getMe(@AuthenticationPrincipal JwtClaims claims) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        User user = userMapper.selectById(claims.getUserId());
        if (user == null) throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");

        Long postCount = postMapper.selectCount(
                new LambdaQueryWrapper<Post>().eq(Post::getUserId, claims.getUserId()).ge(Post::getStatus, 1));
        Long bookmarkCount = postBookmarkMapper.selectCount(
                new LambdaQueryWrapper<PostBookmark>().eq(PostBookmark::getUserId, claims.getUserId()));
        Long followerCount = userFollowMapper.selectCount(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getTargetId, claims.getUserId()));
        Long followingCount = userFollowMapper.selectCount(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getFollowerId, claims.getUserId()));

        return ApiResponse.success(new MyProfileResponse(
                user.getNickname(), user.getBio(),
                Integer.valueOf(1).equals(user.getUseAvatar()),
                user.getAvatarUrl(),
                resolveRole(user), resolveBadge(claims.getUserId()),
                postCount, bookmarkCount, followerCount, followingCount
        ));
    }

    record UpdateProfileRequest(String nickname, String bio, Boolean useAvatar) {}

    @PutMapping("/me/profile")
    @Operation(summary = "更新自己的資料", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> updateMe(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody UpdateProfileRequest body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        User user = userMapper.selectById(claims.getUserId());
        if (user == null) throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");

        if (body.nickname() != null) user.setNickname(body.nickname());
        if (body.bio() != null) user.setBio(body.bio());
        if (body.useAvatar() != null) user.setUseAvatar(Boolean.TRUE.equals(body.useAvatar()) ? 1 : 0);
        userMapper.updateById(user);
        return ApiResponse.success(null);
    }

    @GetMapping("/{id}/profile")
    @Operation(summary = "取得用戶公開資料")
    public ApiResponse<UserProfileResponse> getProfile(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        User user = userMapper.selectById(id);
        if (user == null) throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");

        String role = resolveRole(user);
        String badge = resolveBadge(id);

        Long postCount = postMapper.selectCount(
                new LambdaQueryWrapper<Post>()
                        .eq(Post::getUserId, id)
                        .ge(Post::getStatus, 1));

        Long followingCount = userFollowMapper.selectCount(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getFollowerId, id));

        Long followerCount = userFollowMapper.selectCount(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getTargetId, id));

        Boolean isFollowed = null;
        if (claims != null && !claims.getUserId().equals(id)) {
            isFollowed = userFollowMapper.selectCount(
                    new LambdaQueryWrapper<UserFollow>()
                            .eq(UserFollow::getFollowerId, claims.getUserId())
                            .eq(UserFollow::getTargetId, id)) > 0;
        }

        String nickname = user.getNickname();
        if (nickname == null) {
            nickname = Integer.valueOf(1).equals(user.getIsGuest())
                    ? "訪客 #" + user.getId()
                    : "用戶 #" + user.getId();
        }

        return ApiResponse.success(new UserProfileResponse(
                user.getId(), nickname, user.getAvatarUrl(), user.getBio(),
                role, badge, postCount, followingCount, followerCount,
                isFollowed, user.getCreatedAt()
        ));
    }

    @GetMapping("/{id}/posts")
    @Operation(summary = "取得用戶的貼文列表")
    public ApiResponse<PageResult<PostResponse>> getUserPosts(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        Long currentUserId = claims != null ? claims.getUserId() : null;
        return ApiResponse.success(postQueryService.listByUser(id, page, size, currentUserId));
    }

    @PostMapping("/{id}/follow")
    @Operation(summary = "追蹤 / 取消追蹤", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Map<String, Object>> toggleFollow(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (claims.getUserId().equals(id))
            throw new BusinessException(ResultCode.BAD_REQUEST, "不能追蹤自己");

        UserFollow existing = userFollowMapper.selectOne(
                new LambdaQueryWrapper<UserFollow>()
                        .eq(UserFollow::getFollowerId, claims.getUserId())
                        .eq(UserFollow::getTargetId, id));

        boolean followed;
        if (existing != null) {
            userFollowMapper.deleteById(existing.getId());
            followed = false;
        } else {
            if (userMapper.selectById(id) == null)
                throw new BusinessException(ResultCode.NOT_FOUND, "用戶不存在");
            UserFollow f = new UserFollow();
            f.setFollowerId(claims.getUserId());
            f.setTargetId(id);
            f.setCreatedAt(LocalDateTime.now());
            userFollowMapper.insert(f);
            followed = true;
        }

        Long followerCount = userFollowMapper.selectCount(
                new LambdaQueryWrapper<UserFollow>().eq(UserFollow::getTargetId, id));

        return ApiResponse.success(Map.of("followed", followed, "followerCount", followerCount));
    }

    private String resolveRole(User user) {
        if (Integer.valueOf(1).equals(user.getIsGuest())) return "GUEST";
        if (Integer.valueOf(1).equals(user.getIsSuperAdmin())) return "SUPER_ADMIN";
        if (Integer.valueOf(1).equals(user.getIsAdmin())) return "ADMIN";
        try {
            LiChief chief = liChiefMapper.selectOne(
                    new LambdaQueryWrapper<LiChief>().eq(LiChief::getUserId, user.getId()));
            if (chief != null) return "LI_CHIEF";
        } catch (Exception ignored) {}
        return "USER";
    }

    private String resolveBadge(Long userId) {
        try {
            LiChief chief = liChiefMapper.selectOne(
                    new LambdaQueryWrapper<LiChief>().eq(LiChief::getUserId, userId));
            if (chief == null) return null;
            Neighborhood nh = neighborhoodMapper.selectById(chief.getNeighborhoodId());
            return nh != null ? nh.getName() + "里長" : "里長";
        } catch (Exception e) {
            return null;
        }
    }
}
