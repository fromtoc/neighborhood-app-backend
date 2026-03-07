-- user: 新增 is_admin 欄位
ALTER TABLE `user` ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_guest;

-- post: 新增 urgency 欄位（一般/中等/緊急，僅 info/broadcast 使用）
ALTER TABLE post ADD COLUMN urgency VARCHAR(20) NOT NULL DEFAULT 'normal' AFTER type;
