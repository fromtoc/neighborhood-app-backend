-- 貼文分類專屬欄位（JSON），如價格、數量、截止日期等
ALTER TABLE post ADD COLUMN extra_json TEXT NULL AFTER images_json;
