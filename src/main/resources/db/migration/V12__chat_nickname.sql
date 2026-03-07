-- V12: 聊天訊息加入暱稱欄位
ALTER TABLE chat_message
    ADD COLUMN nickname VARCHAR(30) NULL COMMENT '發送者暱稱（前端自訂，匿名時為 NULL）'
        AFTER user_id;
