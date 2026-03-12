-- 店家系統增強：圖片、評分、標籤、按讚、評論

-- 擴充 place 表
ALTER TABLE place
    ADD COLUMN images_json   TEXT          NULL     COMMENT '圖片 JSON array' AFTER cover_image_url,
    ADD COLUMN tags_json     VARCHAR(1024) NULL     COMMENT '標籤 JSON array' AFTER images_json,
    ADD COLUMN rating        DECIMAL(2,1)  NOT NULL DEFAULT 0.0 COMMENT '平均評分 0-5',
    ADD COLUMN review_count  INT           NOT NULL DEFAULT 0   COMMENT '評論數',
    ADD COLUMN like_count    INT           NOT NULL DEFAULT 0   COMMENT '按讚數',
    ADD COLUMN has_home_service TINYINT(1) NOT NULL DEFAULT 0   COMMENT '是否提供到府服務',
    ADD COLUMN is_partner    TINYINT(1)    NOT NULL DEFAULT 0   COMMENT '是否為特約店家';

-- 店家按讚
CREATE TABLE place_like (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id   BIGINT   NOT NULL,
    user_id    BIGINT   NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_place_user (place_id, user_id),
    CONSTRAINT fk_place_like_place FOREIGN KEY (place_id) REFERENCES place(id),
    CONSTRAINT fk_place_like_user  FOREIGN KEY (user_id)  REFERENCES `user`(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='店家按讚';

-- 店家評論
CREATE TABLE place_comment (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    place_id   BIGINT       NOT NULL,
    user_id    BIGINT       NOT NULL,
    content    TEXT         NOT NULL,
    rating     TINYINT      NULL     COMMENT '評分 1-5（可選）',
    like_count INT          NOT NULL DEFAULT 0,
    deleted    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_comment_place FOREIGN KEY (place_id) REFERENCES place(id),
    CONSTRAINT fk_place_comment_user  FOREIGN KEY (user_id)  REFERENCES `user`(id),
    KEY idx_place_id (place_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='店家評論';
