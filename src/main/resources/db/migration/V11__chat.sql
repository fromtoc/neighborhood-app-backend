-- V11: 聊天室 + 訊息表

-- 聊天室（每個里一個公開聊天室，未來可擴充私聊）
CREATE TABLE chat_room (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    neighborhood_id BIGINT       NOT NULL COMMENT '所屬里 ID（NULL = 系統全域）',
    name            VARCHAR(128) NOT NULL COMMENT '聊天室名稱',
    type            VARCHAR(16)  NOT NULL DEFAULT 'neighborhood'
                                          COMMENT 'neighborhood | private',
    last_message    TEXT                  COMMENT '最後一則訊息（快取用）',
    last_message_at DATETIME              COMMENT '最後訊息時間',
    member_count    INT          NOT NULL DEFAULT 0,
    status          TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_chatroom_neighborhood FOREIGN KEY (neighborhood_id) REFERENCES neighborhood(id),
    UNIQUE KEY uk_neighborhood_type (neighborhood_id, type),
    KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天室';

-- 聊天訊息
CREATE TABLE chat_message (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id     BIGINT       NOT NULL,
    user_id     BIGINT       NOT NULL,
    content     TEXT         NOT NULL,
    type        VARCHAR(16)  NOT NULL DEFAULT 'text' COMMENT 'text | image | system',
    deleted     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_room FOREIGN KEY (room_id) REFERENCES chat_room(id),
    CONSTRAINT fk_msg_user FOREIGN KEY (user_id) REFERENCES `user`(id),
    KEY idx_room_created (room_id, created_at),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天訊息';
