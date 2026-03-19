ALTER TABLE user_notification_settings
    ADD COLUMN mention TINYINT(1) NOT NULL DEFAULT 1 COMMENT '被 @ 提及通知' AFTER chat;
