-- 用戶關注的里（最多 3 個）
CREATE TABLE user_neighborhood_follow (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    neighborhood_id BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_neighborhood (user_id, neighborhood_id),
    INDEX idx_user (user_id),
    INDEX idx_neighborhood (neighborhood_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 通知記錄加入所屬里（用於點擊導頁）
ALTER TABLE notification
    ADD COLUMN neighborhood_id BIGINT NULL AFTER ref_id;
