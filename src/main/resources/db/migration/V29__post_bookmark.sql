CREATE TABLE post_bookmark (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    post_id    BIGINT       NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_post (user_id, post_id),
    INDEX      idx_user     (user_id),
    INDEX      idx_post     (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='貼文收藏';
