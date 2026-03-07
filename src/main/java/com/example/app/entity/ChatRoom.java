package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("chat_room")
public class ChatRoom {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long neighborhoodId;
    private String name;
    private String type;
    private Long user1Id;
    private Long user2Id;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Integer memberCount;
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
