CREATE TABLE IF NOT EXISTS `li_chief` (
    `id`               BIGINT     NOT NULL AUTO_INCREMENT,
    `user_id`          BIGINT     NOT NULL COMMENT '使用者 ID',
    `neighborhood_id`  BIGINT     NOT NULL COMMENT '里 ID',
    `created_at`       DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`          TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_neighborhood_id` (`neighborhood_id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '里長指派';
