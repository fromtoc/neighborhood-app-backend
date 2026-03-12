ALTER TABLE user_neighborhood_follow
    ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN alias      VARCHAR(30) NULL;

-- 既有用戶：最早的關注設為預設
UPDATE user_neighborhood_follow f
INNER JOIN (
    SELECT MIN(id) AS min_id FROM user_neighborhood_follow GROUP BY user_id
) t ON f.id = t.min_id
SET f.is_default = 1;

-- 冷卻期紀錄（刪除後 7 天鎖定 slot）
CREATE TABLE follow_cooldown (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    expired_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_expired (user_id, expired_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
