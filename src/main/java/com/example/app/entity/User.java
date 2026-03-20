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

    /** useAvatar 未設定(null) 或 == 1 時返回 avatarUrl，只有明確設為 0 才隱藏 */
    public String getEffectiveAvatarUrl() {
        return Integer.valueOf(0).equals(useAvatar) ? null : avatarUrl;
    }
}
