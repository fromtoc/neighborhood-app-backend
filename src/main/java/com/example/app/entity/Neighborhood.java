package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("neighborhood")
public class Neighborhood {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String liCode;
    private String name;
    private String fullName;
    private String district;
    private String city;
    private Integer status;
    private BigDecimal lat;
    private BigDecimal lng;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @TableLogic
    private Integer deleted;
}
