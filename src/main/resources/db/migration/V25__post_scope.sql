-- 貼文範圍：li = 里級貼文（預設），district = 區級貼文
ALTER TABLE post ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'li' AFTER type;
