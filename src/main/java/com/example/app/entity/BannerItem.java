package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("banner_item")
public class BannerItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long slotId;
    private String sourceType;
    private Long sourceId;
    private String imageUrl;
    private String title;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
