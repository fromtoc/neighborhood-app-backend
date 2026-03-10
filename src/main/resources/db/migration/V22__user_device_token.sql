CREATE TABLE user_device_token (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token      VARCHAR(512) NOT NULL,
    platform   VARCHAR(16)  NOT NULL DEFAULT 'unknown',  -- ios | android | web
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_platform (user_id, platform),
    INDEX idx_token (token(64))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
