-- ============================================================
-- V1: Initial schema
-- ============================================================

CREATE TABLE IF NOT EXISTS `neighborhood`
(
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `li_code`    VARCHAR(32)  NOT NULL COMMENT '里代碼',
    `name`       VARCHAR(64)  NOT NULL COMMENT '里名稱',
    `district`   VARCHAR(64)           COMMENT '區名稱',
    `city`       VARCHAR(64)           COMMENT '縣市名稱',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Logical delete: 0=normal, 1=deleted',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_li_code` (`li_code`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Neighborhood (里)';

CREATE TABLE IF NOT EXISTS `user`
(
    `id`                       BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `nickname`                 VARCHAR(64)          COMMENT 'Display name',
    `avatar_url`               VARCHAR(255)         COMMENT 'Avatar URL',
    `default_neighborhood_id`  BIGINT               COMMENT 'Default neighborhood',
    `created_at`               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `updated_at`               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    `deleted`                  TINYINT(1)  NOT NULL DEFAULT 0 COMMENT 'Logical delete: 0=normal, 1=deleted',
    PRIMARY KEY (`id`),
    KEY `idx_default_neighborhood_id` (`default_neighborhood_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'User';

CREATE TABLE IF NOT EXISTS `user_identity`
(
    `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `user_id`      BIGINT       NOT NULL COMMENT 'FK to user.id',
    `provider`     VARCHAR(32)  NOT NULL COMMENT 'OAuth provider, e.g. google / apple / line',
    `provider_uid` VARCHAR(128) NOT NULL COMMENT 'User ID from provider',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_provider_uid` (`provider`, `provider_uid`),
    KEY `idx_user_id` (`user_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'User OAuth identity';

CREATE TABLE IF NOT EXISTS `auth_session`
(
    `id`                  BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `user_id`             BIGINT       NOT NULL COMMENT 'FK to user.id',
    `refresh_token_hash`  VARCHAR(128) NOT NULL COMMENT 'Hashed refresh token',
    `expires_at`          DATETIME     NOT NULL COMMENT 'Expiry time',
    `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (`id`),
    KEY `idx_refresh_token_hash` (`refresh_token_hash`),
    KEY `idx_expires_at` (`expires_at`),
    KEY `idx_user_id` (`user_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Auth session (refresh token store)';
