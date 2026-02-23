package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_identity")
public class UserIdentity {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String provider;
    private String providerUid;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
