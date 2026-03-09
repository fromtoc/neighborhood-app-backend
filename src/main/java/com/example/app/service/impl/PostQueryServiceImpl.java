package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.post.CreatePostRequest;
import com.example.app.dto.post.PostResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Post;
import com.example.app.entity.User;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.PostQueryService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostQueryServiceImpl implements PostQueryService {

    private final PostMapper          postMapper;
    private final UserMapper          userMapper;
    private final NeighborhoodMapper  neighborhoodMapper;
    private final ObjectMapper        objectMapper;

    /** 所有管理員類型（用於社群 tab 排除） */
    private static final List<String> ADMIN_TYPES       = List.of("info", "broadcast", "district_info", "li_info");
    /** 里層管理員類型（district_info 除外） */
    private static final List<String> LOCAL_ADMIN_TYPES = List.of("info", "li_info", "broadcast");

    @Override
    public PageResult<PostResponse> listByNeighborhood(Long neighborhoodId, String type, int page, int size) {
        LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<Post>()
                .eq(Post::getStatus, 1);

        if ("info".equals(type)) {
            // 資訊 tab：
            //   - li_info / broadcast / info（向下相容）：只顯示當前里
            //   - district_info：顯示同一行政區所有里
            List<Long> districtNhIds = getDistrictNeighborhoodIds(neighborhoodId);
            wrapper.and(w -> w
                    .and(inner -> inner
                            .eq(Post::getNeighborhoodId, neighborhoodId)
                            .in(Post::getType, LOCAL_ADMIN_TYPES))
                    .or(inner -> inner
                            .eq(Post::getType, "district_info")
                            .in(Post::getNeighborhoodId, districtNhIds)));
        } else if (StringUtils.hasText(type)) {
            wrapper.eq(Post::getNeighborhoodId, neighborhoodId)
                   .eq(Post::getType, type);
        } else {
            // 社群 tab：排除所有管理員類型貼文
            wrapper.eq(Post::getNeighborhoodId, neighborhoodId)
                   .notIn(Post::getType, ADMIN_TYPES);
        }

        wrapper.orderByDesc(Post::getCreatedAt);

        IPage<Post> result = postMapper.selectPage(new Page<>(page, size), wrapper);
        List<Post> posts = result.getRecords();

        // 批次查詢作者資訊
        Map<Long, User> userMap = batchLoadUsers(posts);

        List<PostResponse> responses = posts.stream()
                .map(p -> {
                    User u = userMap.get(p.getUserId());
                    return PostResponse.from(p, buildName(u), buildRole(u));
                })
                .toList();
        return new PageResult<>(result.getTotal(), responses);
    }

    private Map<Long, User> batchLoadUsers(List<Post> posts) {
        if (posts.isEmpty()) return Map.of();
        List<Long> userIds = posts.stream().map(Post::getUserId).distinct().toList();
        return userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
    }

    private static String buildName(User u) {
        if (u == null) return null;
        if (u.getNickname() != null) return u.getNickname();
        if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
        return "里民 #" + u.getId();
    }

    private static String buildRole(User u) {
        if (u == null) return null;
        return resolveRoleFromUser(u).name();
    }

    @Override
    public PostResponse getById(Long id) {
        Post post = postMapper.selectById(id);
        if (post == null) return null;
        List<User> users = userMapper.selectBatchIds(List.of(post.getUserId()));
        User u = users.isEmpty() ? null : users.get(0);
        return PostResponse.from(post, buildName(u), buildRole(u));
    }

    @Override
    public PostResponse updatePost(Long postId, Long requesterId, UserRole requesterRole, String title, String content) {
        Post post = postMapper.selectById(postId);
        if (post == null) throw new BusinessException(ResultCode.NOT_FOUND, "貼文不存在");

        if (!post.getUserId().equals(requesterId))
            throw new BusinessException(ResultCode.FORBIDDEN, "只能編輯自己的貼文");

        // 一般用戶不能編輯 info/broadcast
        if (requesterRole == UserRole.USER || requesterRole == UserRole.GUEST) {
            if (ADMIN_TYPES.contains(post.getType()))
                throw new BusinessException(ResultCode.FORBIDDEN, "一般用戶無法編輯資訊/廣播貼文");
        }

        postMapper.update(new LambdaUpdateWrapper<Post>()
                .eq(Post::getId, postId)
                .set(Post::getTitle, title)
                .set(Post::getContent, content));

        return getById(postId);
    }

    @Override
    public void deletePost(Long postId, Long requesterId, UserRole requesterRole) {
        Post post = postMapper.selectById(postId);
        if (post == null) throw new BusinessException(ResultCode.NOT_FOUND, "貼文不存在");

        boolean isOwn = post.getUserId().equals(requesterId);

        if (requesterRole == UserRole.SUPER_ADMIN) {
            // 超管可刪任何人的貼文
        } else if (requesterRole == UserRole.ADMIN) {
            if (!isOwn) {
                // 管理員只能刪一般用戶的貼文
                User author = userMapper.selectById(post.getUserId());
                UserRole authorRole = resolveRoleFromUser(author);
                if (authorRole == UserRole.ADMIN || authorRole == UserRole.SUPER_ADMIN)
                    throw new BusinessException(ResultCode.FORBIDDEN, "無法刪除其他管理員的貼文");
            }
        } else {
            // 一般用戶只能刪自己的社群貼文
            if (!isOwn)
                throw new BusinessException(ResultCode.FORBIDDEN, "只能刪除自己的貼文");
            if (ADMIN_TYPES.contains(post.getType()))
                throw new BusinessException(ResultCode.FORBIDDEN, "一般用戶無法刪除資訊/廣播貼文");
        }

        postMapper.deleteById(postId);
    }

    /** 取得同一行政區（city + district）所有 status=1 里的 ID */
    private List<Long> getDistrictNeighborhoodIds(Long neighborhoodId) {
        Neighborhood hood = neighborhoodMapper.selectById(neighborhoodId);
        if (hood == null || hood.getCity() == null || hood.getDistrict() == null) {
            return List.of(neighborhoodId);
        }
        return neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>()
                        .eq(Neighborhood::getCity, hood.getCity())
                        .eq(Neighborhood::getDistrict, hood.getDistrict())
                        .eq(Neighborhood::getStatus, 1)
        ).stream().map(Neighborhood::getId).toList();
    }

    private static UserRole resolveRoleFromUser(User user) {
        if (user == null) return UserRole.GUEST;
        if (Integer.valueOf(1).equals(user.getIsGuest()))      return UserRole.GUEST;
        if (Integer.valueOf(1).equals(user.getIsSuperAdmin())) return UserRole.SUPER_ADMIN;
        if (Integer.valueOf(1).equals(user.getIsAdmin()))      return UserRole.ADMIN;
        return UserRole.USER;
    }

    @Override
    public Post create(Long userId, CreatePostRequest req) {
        Post post = new Post();
        post.setNeighborhoodId(req.getNeighborhoodId());
        post.setUserId(userId);
        post.setTitle(req.getTitle());
        post.setContent(req.getContent());
        post.setType(req.getType() != null ? req.getType() : "fresh");
        post.setUrgency(req.getUrgency() != null ? req.getUrgency() : "normal");
        post.setPlaceId(req.getPlaceId());
        post.setLikeCount(0);
        post.setCommentCount(0);
        post.setStatus(1);

        if (req.getImages() != null && !req.getImages().isEmpty()) {
            try {
                post.setImagesJson(objectMapper.writeValueAsString(req.getImages()));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize images JSON", e);
            }
        }

        postMapper.insert(post);
        return post;
    }
}
