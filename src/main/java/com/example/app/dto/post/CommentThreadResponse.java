package com.example.app.dto.post;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;
import java.util.Map;

/**
 * 分享連結用：一次回傳完整祖先鏈 + 每層的直接回覆
 * chain        : [root, ..., target]（由上到下）
 * repliesByParent : { parentId → 直接子回覆列表 }
 */
@Getter
@AllArgsConstructor
public class CommentThreadResponse {
    private List<PostCommentResponse> chain;
    private Map<Long, List<PostCommentResponse>> repliesByParent;
}
