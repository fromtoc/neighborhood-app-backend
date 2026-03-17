ALTER TABLE user_notification_settings
    ADD COLUMN master       TINYINT(1) NOT NULL DEFAULT 1 COMMENT '總開關' AFTER user_id,
    ADD COLUMN info_medium  TINYINT(1) NOT NULL DEFAULT 1 COMMENT '中等公告' AFTER new_info,
    ADD COLUMN info_normal  TINYINT(1) NOT NULL DEFAULT 1 COMMENT '一般公告' AFTER info_medium,
    ADD COLUMN post_reply   TINYINT(1) NOT NULL DEFAULT 1 COMMENT '貼文回覆通知' AFTER new_post,
    ADD COLUMN garbage_truck TINYINT(1) NOT NULL DEFAULT 1 COMMENT '垃圾車提醒' AFTER info_normal;
