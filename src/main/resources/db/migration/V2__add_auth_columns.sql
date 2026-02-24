-- ============================================================
-- V2: Auth module columns
-- ============================================================

ALTER TABLE `user`
    ADD COLUMN `is_guest` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Guest user: 0=no, 1=yes'
        AFTER `avatar_url`;

ALTER TABLE `neighborhood`
    ADD COLUMN `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Status: 1=active, 0=inactive'
        AFTER `city`;
