package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("app_release")
public class AppRelease {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String version;
    private String platform;
    private String title;
    private String content;
    private String downloadUrl;
    private Integer isForce;
    private Integer isPublished;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
