-- V9: 地點/店家表（place）

CREATE TABLE place (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    neighborhood_id BIGINT       NOT NULL COMMENT '所屬里 ID',
    category_id     BIGINT                COMMENT '分類 ID',
    name            VARCHAR(128) NOT NULL COMMENT '店家/地點名稱',
    description     TEXT                  COMMENT '簡介',
    address         VARCHAR(255)          COMMENT '地址',
    phone           VARCHAR(32)           COMMENT '電話',
    website         VARCHAR(512)          COMMENT '官方網站',
    hours           VARCHAR(512)          COMMENT '營業時間（JSON string）',
    lat             DECIMAL(10, 7)        COMMENT '緯度',
    lng             DECIMAL(10, 7)        COMMENT '經度',
    cover_image_url VARCHAR(512)          COMMENT '封面圖片 URL',
    status          TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=正常 0=下架',
    deleted         TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '邏輯刪除',
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_place_neighborhood FOREIGN KEY (neighborhood_id) REFERENCES neighborhood(id),
    CONSTRAINT fk_place_category     FOREIGN KEY (category_id)     REFERENCES category(id),
    KEY idx_neighborhood_id (neighborhood_id),
    KEY idx_category_id (category_id),
    KEY idx_status (status),
    KEY idx_lat_lng (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地點/店家';
