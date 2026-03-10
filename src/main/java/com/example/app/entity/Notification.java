package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("notification")
public class Notification {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long   userId;
    /** new_post | new_info | chat | private_message */
    private String type;
    private String title;
    private String body;
    /** post | chat_message */
    private String refType;
    private Long   refId;
    /** 通知所屬里 ID（用於前端點擊導頁） */
    private Long   neighborhoodId;
    private Integer isRead;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
