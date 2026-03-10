-- 通知收件匣
CREATE TABLE notification (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    type       VARCHAR(32)  NOT NULL,   -- new_post | new_info | chat | private_message
    title      VARCHAR(200) NOT NULL,
    body       VARCHAR(500),
    ref_type   VARCHAR(32),             -- post | chat_message
    ref_id     BIGINT,                  -- 對應實體 ID
    is_read    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_unread (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 使用者通知開關（app / web 共用）
CREATE TABLE user_notification_settings (
    user_id         BIGINT PRIMARY KEY,
    new_post        TINYINT(1) NOT NULL DEFAULT 1,
    new_info        TINYINT(1) NOT NULL DEFAULT 1,
    chat            TINYINT(1) NOT NULL DEFAULT 1,
    private_message TINYINT(1) NOT NULL DEFAULT 1,
    updated_at      DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
