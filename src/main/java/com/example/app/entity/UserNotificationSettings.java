package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_notification_settings")
public class UserNotificationSettings {

    @TableId(type = IdType.INPUT)
    private Long userId;

    private Integer newPost;
    private Integer newInfo;
    private Integer chat;
    private Integer privateMessage;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
