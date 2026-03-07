-- ============================================================
-- V7: Audit log（append-only，不做 UPDATE / DELETE）
-- 記錄管理操作：import / seo rebuild / place upsert 等
-- ============================================================

CREATE TABLE IF NOT EXISTS `audit_log`
(
    `id`           BIGINT        NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
    `actor_id`     BIGINT                 COMMENT '操作者 user.id（系統排程為 NULL）',
    `actor_type`   VARCHAR(16)   NOT NULL DEFAULT 'system' COMMENT 'user / system / admin',
    `action`       VARCHAR(64)   NOT NULL COMMENT '操作代碼，例如 geo.import / seo.rebuild / place.upsert',
    `target_type`  VARCHAR(32)            COMMENT '目標資源類型，例如 neighborhood / place / post',
    `target_id`    BIGINT                 COMMENT '目標資源 ID',
    `payload_json` JSON                   COMMENT '操作摘要（筆數、錯誤等）',
    `ip`           VARCHAR(45)            COMMENT '來源 IP',
    `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作時間',
    PRIMARY KEY (`id`),
    KEY `idx_action`     (`action`),
    KEY `idx_actor_id`   (`actor_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = 'Audit log（append-only）';
