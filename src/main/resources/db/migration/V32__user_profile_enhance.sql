-- V32: 使用者個人資料增強
ALTER TABLE `user`
    ADD COLUMN bio         VARCHAR(100) NULL COMMENT '自我介紹' AFTER nickname,
    ADD COLUMN use_avatar  TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否顯示第三方頭像';
