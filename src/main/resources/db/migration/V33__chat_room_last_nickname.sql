ALTER TABLE chat_room
    ADD COLUMN last_message_nickname VARCHAR(50) NULL COMMENT '最後訊息發送者暱稱' AFTER last_message;
