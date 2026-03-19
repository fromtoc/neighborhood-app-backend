CREATE TABLE IF NOT EXISTS `user_follow` (
    `id`          BIGINT     NOT NULL AUTO_INCREMENT,
    `follower_id` BIGINT     NOT NULL COMMENT '追蹤者 user_id',
    `target_id`   BIGINT     NOT NULL COMMENT '被追蹤者 user_id',
    `created_at`  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_follower_target` (`follower_id`, `target_id`),
    INDEX `idx_target` (`target_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用戶追蹤';
