-- 舊表沒有 id 欄位，先刪外鍵再重建
ALTER TABLE post_like DROP FOREIGN KEY fk_like_post;
ALTER TABLE post_like DROP FOREIGN KEY fk_like_user;
ALTER TABLE post_like DROP PRIMARY KEY;
ALTER TABLE post_like ADD COLUMN id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST;
ALTER TABLE post_like ADD UNIQUE KEY uk_post_user (post_id, user_id);
