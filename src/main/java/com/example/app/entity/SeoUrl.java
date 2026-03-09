package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("seo_url")
public class SeoUrl {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String  url;
    private String  type;
    private Long    refId;
    private LocalDateTime lastmod;
    private Integer isIndexable;
    private BigDecimal priority;
    private String  changefreq;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
