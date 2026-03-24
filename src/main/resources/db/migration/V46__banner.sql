-- 廣告位
CREATE TABLE banner_slot (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL UNIQUE COMMENT '程式用 key，如 homepage_top',
    label       VARCHAR(128) NOT NULL        COMMENT '顯示名稱，如 首頁頂部輪播',
    max_items   INT          NOT NULL DEFAULT 10,
    sort_order  INT          NOT NULL DEFAULT 0,
    status      TINYINT      NOT NULL DEFAULT 1 COMMENT '1=啟用 0=停用',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 廣告項目
CREATE TABLE banner_item (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    slot_id     BIGINT       NOT NULL,
    source_type VARCHAR(32)  NOT NULL COMMENT 'post / place',
    source_id   BIGINT       NOT NULL COMMENT '對應 post.id 或 place.id',
    image_url   VARCHAR(512) NOT NULL COMMENT '廣告圖片',
    title       VARCHAR(256) NULL     COMMENT '可覆蓋來源標題',
    sort_order  INT          NOT NULL DEFAULT 0,
    status      TINYINT      NOT NULL DEFAULT 1 COMMENT '1=啟用 0=停用',
    start_at    DATETIME     NULL     COMMENT '定時上架（NULL=立即）',
    end_at      DATETIME     NULL     COMMENT '定時下架（NULL=永久）',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slot_status (slot_id, status, sort_order),
    CONSTRAINT fk_banner_item_slot FOREIGN KEY (slot_id) REFERENCES banner_slot(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 預設廣告位
INSERT INTO banner_slot (name, label, max_items, sort_order) VALUES
('homepage_top', '首頁頂部輪播', 10, 1);
