package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("`user`")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String nickname;
    private String bio;
    private Integer useAvatar;
    private String avatarUrl;
    private Integer isGuest;
    private Integer isAdmin;
    private Integer isSuperAdmin;
    private Integer isSystem;
    private Long defaultNeighborhoodId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
