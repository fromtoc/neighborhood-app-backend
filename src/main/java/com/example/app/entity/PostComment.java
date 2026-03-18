package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("post_comment")
public class PostComment {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long postId;
    private Long parentId;
    private Long userId;
    private String nickname;
    private String content;
    private Integer likeCount;

    @com.baomidou.mybatisplus.annotation.TableLogic
    private Integer deleted;
    private Integer contentDeleted;
    private Integer edited;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
