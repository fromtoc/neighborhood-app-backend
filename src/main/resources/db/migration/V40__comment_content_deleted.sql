-- 留言用 content_deleted 標記刪除（避免全局 logic-delete-field=deleted 自動過濾）
ALTER TABLE post_comment ADD COLUMN content_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '內容是否已刪除' AFTER deleted;
