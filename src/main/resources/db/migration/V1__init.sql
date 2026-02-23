-- ============================================================
-- V1: Initial schema — skeleton placeholder
-- Add your DDL here as the project grows.
-- ============================================================

CREATE TABLE IF NOT EXISTS `app_user`
(
    `id`         BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `username`   VARCHAR(64) NOT NULL COMMENT 'Username',
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `updated_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`    TINYINT(1)  NOT NULL DEFAULT 0 COMMENT 'Logical delete: 0=normal, 1=deleted',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'User (skeleton)';
