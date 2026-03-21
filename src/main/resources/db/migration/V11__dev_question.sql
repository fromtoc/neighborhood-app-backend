CREATE TABLE dev_question (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    question   TEXT         NOT NULL,
    answer     TEXT,
    status     VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'pending / answered',
    asked_by   VARCHAR(100) DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answered_at DATETIME    DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
