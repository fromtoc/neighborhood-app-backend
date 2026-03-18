-- 留言：新增 edited 標記
ALTER TABLE post_comment ADD COLUMN edited TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已編輯' AFTER deleted;

-- 貼文：新增 edited 標記
ALTER TABLE post ADD COLUMN edited TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已編輯' AFTER status;
