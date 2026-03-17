CREATE TABLE app_release (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    version     VARCHAR(20)  NOT NULL COMMENT '版本號 e.g. 1.2.0',
    platform    VARCHAR(20)  NOT NULL DEFAULT 'all' COMMENT 'ios/android/all',
    title       VARCHAR(100) NOT NULL COMMENT '版本標題',
    content     TEXT         NULL     COMMENT '更新內容 (markdown)',
    download_url VARCHAR(500) NULL    COMMENT '下載連結',
    is_force    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '強制更新',
    is_published TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '是否發佈',
    published_at DATETIME    NULL     COMMENT '發佈時間',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted     TINYINT(1)   NOT NULL DEFAULT 0,
    INDEX idx_platform_version (platform, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
