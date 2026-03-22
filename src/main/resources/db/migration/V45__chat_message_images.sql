ALTER TABLE chat_message ADD COLUMN images JSON DEFAULT NULL COMMENT '圖片 URL 陣列，JSON 格式 ["url1","url2"]';
