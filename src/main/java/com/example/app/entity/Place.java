package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("place")
public class Place {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long neighborhoodId;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String website;
    private String hours;
    private BigDecimal lat;
    private BigDecimal lng;
    private String coverImageUrl;
    private String imagesJson;
    private String tagsJson;
    private BigDecimal rating;
    private Integer reviewCount;
    private Integer likeCount;
    private Integer hasHomeService;
    private Integer isPartner;
    private Integer status;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
