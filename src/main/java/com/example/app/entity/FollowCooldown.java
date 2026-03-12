package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("follow_cooldown")
public class FollowCooldown {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private LocalDateTime expiredAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
