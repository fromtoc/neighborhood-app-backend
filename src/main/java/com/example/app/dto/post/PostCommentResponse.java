package com.example.app.dto.post;

import com.example.app.entity.PostComment;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class PostCommentResponse {

    private Long id;
    private Long postId;
    private Long parentId;
    private Long userId;
    private String nickname;
    private String content;
    private LocalDateTime createdAt;

    /** 留言按讚數 */
    private int likeCount;

    /** 當前用戶是否已按讚 */
    private Boolean liked;

    /** 直接子回覆數量 */
    private int replyCount;

    /** 前 3 位回覆者暱稱（用於顯示 mini avatars） */
    private List<String> topRepliers;

    /** 內容是否已刪除 */
    private Boolean contentDeleted;

    /** 是否已編輯 */
    private Boolean edited;

    public static PostCommentResponse from(PostComment c, String nickname,
                                           int replyCount, List<String> topRepliers) {
        return from(c, nickname, replyCount, topRepliers, false);
    }

    public static PostCommentResponse from(PostComment c, String nickname,
                                           int replyCount, List<String> topRepliers, Boolean liked) {
        boolean isDeleted = Integer.valueOf(1).equals(c.getContentDeleted());
        return PostCommentResponse.builder()
                .id(c.getId())
                .postId(c.getPostId())
                .parentId(c.getParentId())
                .userId(c.getUserId())
                .nickname(nickname)
                .content(isDeleted ? null : c.getContent())
                .createdAt(c.getCreatedAt())
                .likeCount(c.getLikeCount() != null ? c.getLikeCount() : 0)
                .liked(liked)
                .replyCount(replyCount)
                .topRepliers(topRepliers)
                .contentDeleted(isDeleted ? true : null)
                .edited(!isDeleted && Integer.valueOf(1).equals(c.getEdited()) ? true : null)
                .build();
    }

    /** 向下相容（無 replyCount / topRepliers） */
    public static PostCommentResponse from(PostComment c, String nickname) {
        return from(c, nickname, 0, List.of());
    }

    public static PostCommentResponse from(PostComment c) {
        return from(c, c.getNickname());
    }
}
