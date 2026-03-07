-- ============================================================
-- V6: SEO URL registry
-- 記錄所有可被 Google 索引的頁面 URL，供 sitemap 使用
-- ============================================================

CREATE TABLE IF NOT EXISTS `seo_url`
(
    `id`          BIGINT        NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `url`         VARCHAR(512)  NOT NULL COMMENT '相對路徑，例如 /tw/台北市/信義區/信義里',
    `type`        VARCHAR(32)   NOT NULL COMMENT '頁面類型：neighborhood / place / post',
    `ref_id`      BIGINT                 COMMENT '對應資料 ID（neighborhood.id / place.id / post.id）',
    `lastmod`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最後更新時間（sitemap lastmod）',
    `is_indexable` TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '是否可被索引：1=yes, 0=noindex',
    `priority`    DECIMAL(2,1)  NOT NULL DEFAULT 0.5 COMMENT 'Sitemap priority（0.0~1.0）',
    `changefreq`  VARCHAR(16)   NOT NULL DEFAULT 'weekly' COMMENT 'Sitemap changefreq',
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_url` (`url`(512)),
    KEY `idx_type_indexable` (`type`, `is_indexable`),
    KEY `idx_lastmod`        (`lastmod`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'SEO URL registry — sitemap data source';
