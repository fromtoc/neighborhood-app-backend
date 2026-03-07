package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("post")
public class Post {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long neighborhoodId;
    private Long userId;
    private String title;
    private String content;

    /** JSON array string — e.g. ["https://...","https://..."] */
    private String imagesJson;

    /** info | broadcast | fresh | store_visit | selling | renting | group_buy | group_event | free_give | help | want_rent | find | recruit | report */
    private String type;

    /** normal | medium | urgent  (僅 info/broadcast 使用) */
    private String urgency;

    private Long placeId;
    private Integer likeCount;
    private Integer commentCount;
    private Integer status;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
