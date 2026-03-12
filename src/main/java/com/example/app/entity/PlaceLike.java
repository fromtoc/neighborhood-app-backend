package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("place_like")
public class PlaceLike {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long placeId;
    private Long userId;
    private LocalDateTime createdAt;
}
