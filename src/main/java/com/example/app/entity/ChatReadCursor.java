package com.example.app.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("chat_read_cursor")
public class ChatReadCursor {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long roomId;
    private Long lastReadMsgId;
    private LocalDateTime updatedAt;
}
