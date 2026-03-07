-- V18: 超級管理員欄位
ALTER TABLE `user`
    ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin;
