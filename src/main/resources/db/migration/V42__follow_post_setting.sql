ALTER TABLE user_notification_settings
    ADD COLUMN follow_post TINYINT(1) NOT NULL DEFAULT 1 COMMENT '追蹤對象發文通知' AFTER new_post;
