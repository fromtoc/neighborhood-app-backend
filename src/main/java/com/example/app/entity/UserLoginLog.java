package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_login_log")
public class UserLoginLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long   userId;
    private String provider;   // NULL for guest
    private String deviceId;
    private String ip;
    private Integer isGuest;   // 0 = registered, 1 = guest

    private LocalDateTime createdAt;
}
