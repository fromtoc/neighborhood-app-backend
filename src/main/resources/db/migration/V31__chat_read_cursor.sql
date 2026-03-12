-- V31: 聊天已讀游標（追蹤每個使用者在每個聊天室的已讀位置）
CREATE TABLE chat_read_cursor (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    room_id         BIGINT NOT NULL,
    last_read_msg_id BIGINT NOT NULL DEFAULT 0 COMMENT '最後已讀訊息 ID',
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_room (user_id, room_id),
    CONSTRAINT fk_cursor_user FOREIGN KEY (user_id) REFERENCES `user`(id),
    CONSTRAINT fk_cursor_room FOREIGN KEY (room_id) REFERENCES chat_room(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天已讀游標';
