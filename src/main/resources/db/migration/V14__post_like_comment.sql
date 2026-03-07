-- 按讚記錄（每個用戶對每篇貼文只能讚一次）
CREATE TABLE IF NOT EXISTS post_like (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    post_id    BIGINT       NOT NULL,
    user_id    BIGINT       NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_post_user (post_id, user_id),
    KEY idx_post_id (post_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

-- 留言
CREATE TABLE IF NOT EXISTS post_comment (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    post_id    BIGINT        NOT NULL,
    user_id    BIGINT        NOT NULL,
    nickname   VARCHAR(30)   NULL,
    content    VARCHAR(500)  NOT NULL,
    deleted    TINYINT       NOT NULL DEFAULT 0,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_id (post_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
