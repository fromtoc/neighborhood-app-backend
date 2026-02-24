-- ============================================================
-- V3: User login log table
-- ============================================================

CREATE TABLE IF NOT EXISTS `user_login_log`
(
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `user_id`    BIGINT       NOT NULL COMMENT 'FK to user.id',
    `provider`   VARCHAR(32)           COMMENT 'Social provider (GOOGLE/APPLE/FACEBOOK/LINE), NULL for guest',
    `device_id`  VARCHAR(128)          COMMENT 'Client device ID',
    `ip`         VARCHAR(45)           COMMENT 'Client IP address (IPv4/IPv6)',
    `is_guest`   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '0=registered user, 1=guest',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Event time',
    PRIMARY KEY (`id`),
    KEY `idx_user_id`    (`user_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'User login / registration event log (append-only)';
