-- V13: 支援一對一私聊
-- 1. neighborhood_id 改為可 NULL（私聊房間不屬於任何里）
ALTER TABLE chat_room MODIFY COLUMN neighborhood_id BIGINT NULL;

-- 2. 加入私聊雙方用戶欄位（user1_id < user2_id 保持正規順序）
ALTER TABLE chat_room
    ADD COLUMN user1_id BIGINT NULL COMMENT '私聊用戶 1（較小 ID）' AFTER type,
    ADD COLUMN user2_id BIGINT NULL COMMENT '私聊用戶 2（較大 ID）' AFTER user1_id;

-- 3. 私聊房間唯一鍵（確保兩人之間只有一個私聊房間）
ALTER TABLE chat_room
    ADD UNIQUE KEY uk_private_users (user1_id, user2_id);

-- 4. 外鍵
ALTER TABLE chat_room
    ADD CONSTRAINT fk_room_user1 FOREIGN KEY (user1_id) REFERENCES `user`(id),
    ADD CONSTRAINT fk_room_user2 FOREIGN KEY (user2_id) REFERENCES `user`(id);
