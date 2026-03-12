ALTER TABLE chat_room
    ADD COLUMN last_message_user_id BIGINT NULL COMMENT '最後訊息發送者ID' AFTER last_message_nickname;
