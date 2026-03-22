package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "chat_message", autoResultMap = true)
public class ChatMessage {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long roomId;
    private Long userId;
    private String nickname;
    private String content;

    /** text | image | system */
    private String type;

    /** 圖片 URL 陣列 */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> images;

    @TableLogic
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
