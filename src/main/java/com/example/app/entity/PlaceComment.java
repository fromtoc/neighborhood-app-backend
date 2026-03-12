package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("place_comment")
public class PlaceComment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long placeId;
    private Long userId;
    private String content;
    private Integer rating;
    private Integer likeCount;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
