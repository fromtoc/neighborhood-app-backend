ALTER TABLE post_comment
    ADD COLUMN like_count INT NOT NULL DEFAULT 0 AFTER content;

CREATE TABLE post_comment_like (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    comment_id BIGINT       NOT NULL,
    user_id    BIGINT       NOT NULL,
    created_at DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_comment_like (comment_id, user_id),
    INDEX      idx_pcl_user  (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
