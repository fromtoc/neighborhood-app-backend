package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.post.PostCommentResponse;
import com.example.app.dto.post.PostLikeResponse;
import com.example.app.entity.Post;
import com.example.app.entity.PostComment;
import com.example.app.entity.PostLike;
import com.example.app.entity.User;
import com.example.app.mapper.PostCommentMapper;
import com.example.app.mapper.PostLikeMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.app.service.PostInteractionService;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostInteractionServiceImpl implements PostInteractionService {

    private final PostLikeMapper    postLikeMapper;
    private final PostCommentMapper postCommentMapper;
    private final PostMapper        postMapper;
    private final UserMapper        userMapper;

    @Override
    @Transactional
    public PostLikeResponse toggleLike(Long postId, Long userId) {
        PostLike existing = postLikeMapper.selectOne(
                new LambdaQueryWrapper<PostLike>()
                        .eq(PostLike::getPostId, postId)
                        .eq(PostLike::getUserId, userId)
        );

        boolean liked;
        if (existing != null) {
            postLikeMapper.deleteById(existing.getId());
            postMapper.decrementLike(postId);
            liked = false;
        } else {
            PostLike like = new PostLike();
            like.setPostId(postId);
            like.setUserId(userId);
            like.setCreatedAt(java.time.LocalDateTime.now());
            postLikeMapper.insert(like);
            postMapper.incrementLike(postId);
            liked = true;
        }

        Post post = postMapper.selectById(postId);
        int likeCount = post != null ? post.getLikeCount() : 0;
        return new PostLikeResponse(liked, likeCount);
    }

    @Override
    public List<PostCommentResponse> listComments(Long postId) {
        List<PostComment> comments = postCommentMapper.selectList(
                new LambdaQueryWrapper<PostComment>()
                        .eq(PostComment::getPostId, postId)
                        .orderByAsc(PostComment::getCreatedAt)
        );
        if (comments.isEmpty()) return List.of();

        // Batch-load current nicknames from DB
        List<Long> userIds = comments.stream().map(PostComment::getUserId).distinct().toList();
        Map<Long, String> nicknameMap = buildNicknameMap(userIds);

        return comments.stream()
                .map(c -> PostCommentResponse.from(c, nicknameMap.get(c.getUserId())))
                .toList();
    }

    @Override
    @Transactional
    public PostCommentResponse addComment(Long postId, Long userId, String content) {
        // Look up current nickname from DB
        String nickname = resolveNickname(userId);

        PostComment comment = new PostComment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setNickname(nickname);
        comment.setContent(content);
        comment.setDeleted(0);
        comment.setCreatedAt(java.time.LocalDateTime.now());
        comment.setUpdatedAt(java.time.LocalDateTime.now());
        postCommentMapper.insert(comment);

        postMapper.incrementComment(postId);

        return PostCommentResponse.from(comment);
    }

    private String resolveNickname(Long userId) {
        List<User> users = userMapper.selectBatchIds(List.of(userId));
        if (users.isEmpty()) return null;
        User u = users.get(0);
        if (u.getNickname() != null) return u.getNickname();
        if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
        return null;
    }

    private Map<Long, String> buildNicknameMap(List<Long> userIds) {
        return userMapper.selectBatchIds(userIds).stream().collect(Collectors.toMap(
                User::getId,
                u -> {
                    if (u.getNickname() != null) return u.getNickname();
                    if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
                    return "用戶 #" + u.getId();
                }
        ));
    }
}
