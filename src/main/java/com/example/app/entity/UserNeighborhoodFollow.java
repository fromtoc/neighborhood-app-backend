package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_neighborhood_follow")
public class UserNeighborhoodFollow {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long neighborhoodId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
