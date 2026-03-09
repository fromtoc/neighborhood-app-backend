package com.example.app.service;

import com.example.app.dto.post.CommentThreadResponse;
import com.example.app.dto.post.PostCommentResponse;
import com.example.app.dto.post.PostLikeResponse;

import java.util.List;

public interface PostInteractionService {

    /** 切換按讚狀態，回傳最新狀態 */
    PostLikeResponse toggleLike(Long postId, Long userId);

    /**
     * 取得留言列表。
     * @param postId   貼文 id
     * @param parentId null = 頂層留言；非 null = 指定留言的直接回覆
     */
    List<PostCommentResponse> listComments(Long postId, Long parentId);

    /**
     * 新增留言 / 回覆。
     * @param parentId null = 頂層留言；非 null = 回覆某則留言
     */
    PostCommentResponse addComment(Long postId, Long userId, String content, Long parentId);

    /** 取得單則留言（含 replyCount / topRepliers） */
    PostCommentResponse getComment(Long postId, Long commentId);

    /** 切換留言按讚狀態，回傳最新狀態 */
    PostLikeResponse toggleCommentLike(Long commentId, Long userId);

    /**
     * 一次取得祖先鏈 + 每層直接回覆，供分享連結使用。
     * @return null 若目標留言不存在或不屬於 postId
     */
    CommentThreadResponse getCommentThread(Long postId, Long commentId);
}
