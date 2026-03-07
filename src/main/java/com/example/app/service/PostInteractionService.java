package com.example.app.service;

import com.example.app.dto.post.PostCommentResponse;
import com.example.app.dto.post.PostLikeResponse;

import java.util.List;

public interface PostInteractionService {

    /** 切換按讚狀態，回傳最新狀態 */
    PostLikeResponse toggleLike(Long postId, Long userId);

    /** 取得留言列表（依建立時間正序） */
    List<PostCommentResponse> listComments(Long postId);

    /** 新增留言 */
    PostCommentResponse addComment(Long postId, Long userId, String content);
}
