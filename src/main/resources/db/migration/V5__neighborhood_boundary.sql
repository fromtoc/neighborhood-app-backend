-- ============================================================
-- V5: Add boundary geometry column to neighborhood
-- ============================================================

ALTER TABLE `neighborhood`
    ADD COLUMN `boundary` GEOMETRY NULL COMMENT '里多邊形邊界 (SRID 4326)' AFTER `lng`;
