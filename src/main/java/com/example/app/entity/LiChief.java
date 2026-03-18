package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("li_chief")
public class LiChief {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long neighborhoodId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
