-- 系統帳號標記
ALTER TABLE `user`
    ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 0 AFTER is_super_admin;

-- 建立系統帳號（自動取得 id，之後由應用程式查詢 is_system=1）
INSERT INTO `user` (nickname, is_guest, is_admin, is_super_admin, is_system, created_at, updated_at)
VALUES ('系統公告', 0, 1, 0, 1, NOW(), NOW());

-- 爬蟲去重 log
CREATE TABLE crawl_log (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    source     VARCHAR(64)  NOT NULL COMMENT '來源識別碼 e.g. ncdr',
    entry_key  CHAR(64)     NOT NULL COMMENT 'SHA-256 hex of (id + summary)',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_source_entry (source, entry_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
