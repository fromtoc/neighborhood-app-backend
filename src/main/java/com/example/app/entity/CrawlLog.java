package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("crawl_log")
public class CrawlLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String source;
    private String entryKey;
    private LocalDateTime createdAt;
}
