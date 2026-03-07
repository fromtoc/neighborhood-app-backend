-- V10: 社群貼文表（post）

CREATE TABLE post (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    neighborhood_id BIGINT       NOT NULL COMMENT '所屬里 ID',
    user_id         BIGINT       NOT NULL COMMENT '發文者 user ID',
    title           VARCHAR(255)          COMMENT '標題（可選）',
    content         TEXT         NOT NULL COMMENT '內文',
    images_json     JSON                  COMMENT '圖片 URL 陣列（JSON array）',
    type            VARCHAR(32)  NOT NULL DEFAULT 'general'
                                          COMMENT 'general|info|shop_review|event',
    place_id        BIGINT                COMMENT '關聯地點 ID（shop_review 用）',
    like_count      INT          NOT NULL DEFAULT 0,
    comment_count   INT          NOT NULL DEFAULT 0,
    status          TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=正常 0=隱藏',
    deleted         TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_neighborhood FOREIGN KEY (neighborhood_id) REFERENCES neighborhood(id),
    CONSTRAINT fk_post_user         FOREIGN KEY (user_id)         REFERENCES `user`(id),
    CONSTRAINT fk_post_place        FOREIGN KEY (place_id)        REFERENCES place(id),
    KEY idx_neighborhood_created (neighborhood_id, created_at),
    KEY idx_user_id (user_id),
    KEY idx_type (type),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社群貼文';

-- 貼文留言表
CREATE TABLE post_comment (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id    BIGINT  NOT NULL,
    user_id    BIGINT  NOT NULL,
    content    TEXT    NOT NULL,
    deleted    TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_post FOREIGN KEY (post_id) REFERENCES post(id),
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES `user`(id),
    KEY idx_post_id (post_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='貼文留言';

-- 貼文按讚表
CREATE TABLE post_like (
    post_id    BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES post(id),
    CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES `user`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='貼文按讚';
