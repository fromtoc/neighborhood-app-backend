-- ============================================================
-- V4: Add geo and full_name columns to neighborhood
-- ============================================================

ALTER TABLE `neighborhood`
    ADD COLUMN `full_name` VARCHAR(128)   NULL COMMENT '里全名'  AFTER `name`,
    ADD COLUMN `lat`       DECIMAL(9, 7)  NULL COMMENT '緯度'    AFTER `status`,
    ADD COLUMN `lng`       DECIMAL(10, 7) NULL COMMENT '經度'    AFTER `lat`;
