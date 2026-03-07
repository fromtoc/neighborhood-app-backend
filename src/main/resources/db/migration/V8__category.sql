-- V8: 地點分類表（category）
-- 支援兩層結構：parent_id = NULL 為頂層分類，parent_id 指向父分類

CREATE TABLE category (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL COMMENT '分類名稱（繁中）',
    slug        VARCHAR(64)  NOT NULL COMMENT '英文 slug，用於 SEO URL',
    icon        VARCHAR(128)          COMMENT '圖示 URL 或 icon key',
    parent_id   BIGINT                COMMENT '父分類 ID（NULL = 頂層）',
    sort_order  INT          NOT NULL DEFAULT 0 COMMENT '同層排序',
    status      TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=啟用 0=停用',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES category(id),
    UNIQUE KEY uk_slug (slug),
    KEY idx_parent_id (parent_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地點分類';

-- 頂層分類（台灣生活常用）
INSERT INTO category (id, name, slug, icon, parent_id, sort_order) VALUES
(1,  '餐飲',   'food',        '🍜', NULL, 1),
(2,  '購物',   'shopping',    '🛍', NULL, 2),
(3,  '交通',   'transport',   '🚌', NULL, 3),
(4,  '教育',   'education',   '🏫', NULL, 4),
(5,  '醫療',   'medical',     '🏥', NULL, 5),
(6,  '休閒',   'leisure',     '⛺', NULL, 6),
(7,  '政府',   'government',  '🏛',  NULL, 7),
(8,  '住宅',   'residential', '🏠', NULL, 8),
(9,  '其他',   'other',       '📌', NULL, 9);

-- 餐飲子分類
INSERT INTO category (id, name, slug, icon, parent_id, sort_order) VALUES
(101, '早餐店',   'breakfast',   '🥐', 1, 1),
(102, '便當店',   'bento',       '🍱', 1, 2),
(103, '飲料店',   'beverage',    '🧋', 1, 3),
(104, '餐廳',     'restaurant',  '🍽',  1, 4),
(105, '小吃攤',   'street-food', '🍢', 1, 5),
(106, '烘焙咖啡', 'cafe-bakery', '☕', 1, 6);

-- 購物子分類
INSERT INTO category (id, name, slug, icon, parent_id, sort_order) VALUES
(201, '超市',     'supermarket', '🛒', 2, 1),
(202, '藥妝',     'drugstore',   '💊', 2, 2),
(203, '服飾',     'clothing',    '👕', 2, 3),
(204, '3C 數位',  'electronics', '💻', 2, 4);

-- 交通子分類
INSERT INTO category (id, name, slug, icon, parent_id, sort_order) VALUES
(301, 'MRT 站',  'mrt',         '🚇', 3, 1),
(302, '公車站',  'bus-stop',    '🚏', 3, 2),
(303, '停車場',  'parking',     '🅿',  3, 3);
