package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.dto.post.CommentThreadResponse;
import com.example.app.dto.post.PostCommentResponse;
import com.example.app.dto.post.PostLikeResponse;
import com.example.app.entity.Post;
import com.example.app.entity.PostComment;
import com.example.app.entity.PostLike;
import com.example.app.entity.User;
import com.example.app.entity.PostCommentLike;
import com.example.app.mapper.PostCommentLikeMapper;
import com.example.app.mapper.PostCommentMapper;
import com.example.app.mapper.PostLikeMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.app.service.PostInteractionService;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostInteractionServiceImpl implements PostInteractionService {

    private final PostLikeMapper        postLikeMapper;
    private final PostCommentMapper     postCommentMapper;
    private final PostCommentLikeMapper postCommentLikeMapper;
    private final PostMapper            postMapper;
    private final UserMapper            userMapper;
    private final NotificationService   notificationService;

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
    public List<PostCommentResponse> listComments(Long postId, Long parentId) {
        return listComments(postId, parentId, null);
    }

    @Override
    public List<PostCommentResponse> listComments(Long postId, Long parentId, Long currentUserId) {
        // 1. 載入指定層留言
        LambdaQueryWrapper<PostComment> wrapper = new LambdaQueryWrapper<PostComment>()
                .eq(PostComment::getPostId, postId)
                .orderByAsc(PostComment::getCreatedAt);
        if (parentId == null) {
            wrapper.isNull(PostComment::getParentId);
        } else {
            wrapper.eq(PostComment::getParentId, parentId);
        }
        List<PostComment> comments = postCommentMapper.selectList(wrapper);
        if (comments.isEmpty()) return List.of();

        // 2. 批次取暱稱
        List<Long> userIds = comments.stream().map(PostComment::getUserId).distinct().toList();
        Map<Long, String> nicknameMap = buildNicknameMap(userIds);

        // 3. 批次取直接回覆（用來算數量 + 前 3 位回覆者）
        List<Long> commentIds = comments.stream().map(PostComment::getId).toList();
        List<PostComment> childReplies = commentIds.isEmpty() ? List.of() :
                postCommentMapper.selectList(
                        new LambdaQueryWrapper<PostComment>()
                                .in(PostComment::getParentId, commentIds)
                                .orderByAsc(PostComment::getCreatedAt)
                );

        // parentId -> count
        Map<Long, Integer> replyCountMap = childReplies.stream()
                .collect(Collectors.groupingBy(PostComment::getParentId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

        // parentId -> first 3 replier user ids
        Map<Long, List<Long>> topReplierUserIds = new LinkedHashMap<>();
        for (PostComment r : childReplies) {
            topReplierUserIds.computeIfAbsent(r.getParentId(), k -> new ArrayList<>());
            List<Long> list = topReplierUserIds.get(r.getParentId());
            if (list.size() < 3) list.add(r.getUserId());
        }

        // 批次取回覆者暱稱
        Set<Long> replierIds = topReplierUserIds.values().stream()
                .flatMap(Collection::stream).collect(Collectors.toSet());
        Map<Long, String> replierNicknames = replierIds.isEmpty() ? Map.of() : buildNicknameMap(new ArrayList<>(replierIds));

        // 4. 批次查當前用戶的留言按讚狀態
        Set<Long> likedCommentIds = batchCheckCommentLiked(commentIds, currentUserId);

        // 5. 組裝
        return comments.stream().map(c -> {
            int count = replyCountMap.getOrDefault(c.getId(), 0);
            List<String> topRepliers = topReplierUserIds.getOrDefault(c.getId(), List.of())
                    .stream().map(uid -> replierNicknames.getOrDefault(uid, "用戶")).toList();
            Boolean liked = currentUserId != null ? likedCommentIds.contains(c.getId()) : null;
            return PostCommentResponse.from(c, nicknameMap.get(c.getUserId()), count, topRepliers, liked);
        }).toList();
    }

    @Override
    @Transactional
    public PostCommentResponse addComment(Long postId, Long userId, String content, Long parentId) {
        String nickname = resolveNickname(userId);

        PostComment comment = new PostComment();
        comment.setPostId(postId);
        comment.setParentId(parentId);
        comment.setUserId(userId);
        comment.setNickname(nickname);
        comment.setContent(content);
        comment.setDeleted(0);
        comment.setCreatedAt(java.time.LocalDateTime.now());
        comment.setUpdatedAt(java.time.LocalDateTime.now());
        postCommentMapper.insert(comment);

        // 只有頂層留言才增加貼文的 comment_count
        if (parentId == null) {
            postMapper.incrementComment(postId);
        }

        // 通知貼文作者有新回覆
        Post post = postMapper.selectById(postId);
        if (post != null && post.getUserId() != null) {
            String body = content.length() > 80 ? content.substring(0, 80) : content;
            notificationService.onPostReply(post.getUserId(), userId, postId, nickname, body);
        }

        // @ 提及通知
        notificationService.onMention(content, userId, nickname, "post", postId);

        return PostCommentResponse.from(comment);
    }

    @Override
    public PostCommentResponse getComment(Long postId, Long commentId) {
        PostComment c = postCommentMapper.selectById(commentId);
        if (c == null || !c.getPostId().equals(postId)) return null;

        String nickname = buildNicknameMap(List.of(c.getUserId())).get(c.getUserId());

        // 直接子回覆數 + top repliers
        List<PostComment> children = postCommentMapper.selectList(
                new LambdaQueryWrapper<PostComment>()
                        .eq(PostComment::getParentId, commentId)
                        .orderByAsc(PostComment::getCreatedAt)
        );
        int replyCount = children.size();
        List<String> topRepliers = children.stream()
                .limit(3)
                .map(r -> buildNicknameMap(List.of(r.getUserId())).getOrDefault(r.getUserId(), "用戶"))
                .toList();

        return PostCommentResponse.from(c, nickname, replyCount, topRepliers);
    }

    @Override
    @Transactional
    public PostLikeResponse toggleCommentLike(Long commentId, Long userId) {
        PostCommentLike existing = postCommentLikeMapper.selectOne(
                new LambdaQueryWrapper<PostCommentLike>()
                        .eq(PostCommentLike::getCommentId, commentId)
                        .eq(PostCommentLike::getUserId, userId)
        );

        boolean liked;
        if (existing != null) {
            postCommentLikeMapper.deleteById(existing.getId());
            postCommentLikeMapper.decrementLike(commentId);
            liked = false;
        } else {
            PostCommentLike like = new PostCommentLike();
            like.setCommentId(commentId);
            like.setUserId(userId);
            like.setCreatedAt(java.time.LocalDateTime.now());
            postCommentLikeMapper.insert(like);
            postCommentLikeMapper.incrementLike(commentId);
            liked = true;
        }

        PostComment comment = postCommentMapper.selectById(commentId);
        int likeCount = (comment != null && comment.getLikeCount() != null) ? comment.getLikeCount() : 0;
        return new PostLikeResponse(liked, likeCount);
    }

    @Override
    public CommentThreadResponse getCommentThread(Long postId, Long commentId, Long currentUserId) {
        return getCommentThreadInternal(postId, commentId, currentUserId);
    }

    public CommentThreadResponse getCommentThread(Long postId, Long commentId) {
        return getCommentThreadInternal(postId, commentId, null);
    }

    private CommentThreadResponse getCommentThreadInternal(Long postId, Long commentId, Long currentUserId) {
        // 1. 從目標往上爬，建立祖先鏈 [root, ..., target]
        List<PostComment> chain = new ArrayList<>();
        Long cur = commentId;
        while (cur != null) {
            PostComment c = postCommentMapper.selectById(cur);
            if (c == null || !c.getPostId().equals(postId)) break;
            chain.add(0, c);
            cur = c.getParentId();
        }
        if (chain.isEmpty()) return null;

        List<Long> chainIds = chain.stream().map(PostComment::getId).toList();

        // 2. 一次撈出所有鏈節點的直接回覆
        List<PostComment> allReplies = postCommentMapper.selectList(
                new LambdaQueryWrapper<PostComment>()
                        .in(PostComment::getParentId, chainIds)
                        .orderByAsc(PostComment::getCreatedAt)
        );
        Map<Long, List<PostComment>> repliesByParentRaw = allReplies.stream()
                .collect(Collectors.groupingBy(PostComment::getParentId));

        // 3. 撈所有回覆的子孫（只需要 count + top replier），用來填 replyCount/topRepliers
        List<Long> allReplyIds = allReplies.stream().map(PostComment::getId).toList();
        List<PostComment> grandchildren = allReplyIds.isEmpty() ? List.of() :
                postCommentMapper.selectList(
                        new LambdaQueryWrapper<PostComment>()
                                .in(PostComment::getParentId, allReplyIds)
                                .orderByAsc(PostComment::getCreatedAt)
                );

        Map<Long, Integer> grandReplyCount = grandchildren.stream()
                .collect(Collectors.groupingBy(PostComment::getParentId,
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)));

        Map<Long, List<Long>> grandTopUserIds = new LinkedHashMap<>();
        for (PostComment gc : grandchildren) {
            grandTopUserIds.computeIfAbsent(gc.getParentId(), k -> new ArrayList<>());
            List<Long> list = grandTopUserIds.get(gc.getParentId());
            if (list.size() < 3) list.add(gc.getUserId());
        }

        // 4. 批次查暱稱
        Set<Long> allUserIds = new HashSet<>();
        chain.forEach(c -> allUserIds.add(c.getUserId()));
        allReplies.forEach(c -> allUserIds.add(c.getUserId()));
        grandchildren.forEach(c -> allUserIds.add(c.getUserId()));
        Map<Long, String> nicknameMap = buildNicknameMap(new ArrayList<>(allUserIds));

        // 4.5 批次查 liked 狀態
        List<Long> allCommentIds = new ArrayList<>();
        chain.forEach(c -> allCommentIds.add(c.getId()));
        allReplies.forEach(c -> allCommentIds.add(c.getId()));
        grandchildren.forEach(c -> allCommentIds.add(c.getId()));
        Set<Long> likedCommentIds = batchCheckCommentLiked(allCommentIds, currentUserId);

        // 5. 組裝鏈（每個鏈節點的 replyCount 來自 repliesByParentRaw）
        List<PostCommentResponse> chainResp = chain.stream().map(c -> {
            List<PostComment> children = repliesByParentRaw.getOrDefault(c.getId(), List.of());
            int count = children.size();
            List<String> top = children.stream().limit(3)
                    .map(r -> nicknameMap.getOrDefault(r.getUserId(), "用戶")).toList();
            Boolean liked = currentUserId != null ? likedCommentIds.contains(c.getId()) : false;
            return PostCommentResponse.from(c, nicknameMap.get(c.getUserId()), count, top, liked);
        }).toList();

        // 6. 組裝每層回覆（每個回覆的 replyCount 來自 grandchildren）
        Map<Long, List<PostCommentResponse>> repliesByParent = new HashMap<>();
        for (Map.Entry<Long, List<PostComment>> entry : repliesByParentRaw.entrySet()) {
            List<PostCommentResponse> rList = entry.getValue().stream().map(r -> {
                int cnt = grandReplyCount.getOrDefault(r.getId(), 0);
                List<String> top = grandTopUserIds.getOrDefault(r.getId(), List.of())
                        .stream().map(uid -> nicknameMap.getOrDefault(uid, "用戶")).toList();
                Boolean liked = currentUserId != null ? likedCommentIds.contains(r.getId()) : false;
                return PostCommentResponse.from(r, nicknameMap.get(r.getUserId()), cnt, top, liked);
            }).toList();
            repliesByParent.put(entry.getKey(), rList);
        }

        return new CommentThreadResponse(chainResp, repliesByParent);
    }

    private Set<Long> batchCheckCommentLiked(List<Long> commentIds, Long currentUserId) {
        if (currentUserId == null || commentIds.isEmpty()) return Collections.emptySet();
        return postCommentLikeMapper.selectList(
                new LambdaQueryWrapper<PostCommentLike>()
                        .eq(PostCommentLike::getUserId, currentUserId)
                        .in(PostCommentLike::getCommentId, commentIds)
        ).stream().map(PostCommentLike::getCommentId).collect(Collectors.toSet());
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
        if (userIds.isEmpty()) return Map.of();
        return userMapper.selectBatchIds(userIds).stream().collect(Collectors.toMap(
                User::getId,
                u -> {
                    if (u.getNickname() != null) return u.getNickname();
                    if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
                    return "用戶 #" + u.getId();
                }
        ));
    }

    @Override
    @Transactional
    public void deleteComment(Long postId, Long commentId, Long requesterId, String requesterRole) {
        PostComment c = postCommentMapper.selectById(commentId);
        if (c == null || !c.getPostId().equals(postId))
            throw new com.example.app.common.exception.BusinessException(
                    com.example.app.common.result.ResultCode.NOT_FOUND, "留言不存在");
        boolean isOwn = c.getUserId().equals(requesterId);
        boolean isAdmin = "ADMIN".equals(requesterRole) || "SUPER_ADMIN".equals(requesterRole);
        if (!isOwn && !isAdmin)
            throw new com.example.app.common.exception.BusinessException(
                    com.example.app.common.result.ResultCode.FORBIDDEN, "無權刪除此留言");
        // 軟刪除：只改狀態，保留原始內容（回傳時由 DTO 清空）
        c.setContentDeleted(1);
        c.setUpdatedAt(java.time.LocalDateTime.now());
        postCommentMapper.updateById(c);
    }

    @Override
    @Transactional
    public PostCommentResponse editComment(Long postId, Long commentId, Long requesterId, String content) {
        PostComment c = postCommentMapper.selectById(commentId);
        if (c == null || !c.getPostId().equals(postId))
            throw new com.example.app.common.exception.BusinessException(
                    com.example.app.common.result.ResultCode.NOT_FOUND, "留言不存在");
        if (!c.getUserId().equals(requesterId))
            throw new com.example.app.common.exception.BusinessException(
                    com.example.app.common.result.ResultCode.FORBIDDEN, "只能編輯自己的留言");
        if (Integer.valueOf(1).equals(c.getContentDeleted()))
            throw new com.example.app.common.exception.BusinessException(
                    com.example.app.common.result.ResultCode.BAD_REQUEST, "已刪除的留言無法編輯");
        c.setContent(content);
        c.setEdited(1);
        c.setUpdatedAt(java.time.LocalDateTime.now());
        postCommentMapper.updateById(c);
        return PostCommentResponse.from(c);
    }
}
