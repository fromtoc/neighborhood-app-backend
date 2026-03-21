package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("dev_question")
public class DevQuestion {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String question;
    private String answer;
    private String status;
    private String askedBy;
    private LocalDateTime createdAt;
    private LocalDateTime answeredAt;
}
