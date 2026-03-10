package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_device_token")
public class UserDeviceToken {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String token;
    private String platform;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
