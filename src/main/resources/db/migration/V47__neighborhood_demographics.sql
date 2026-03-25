-- 里人口統計資料（戶政司開放資料）
CREATE TABLE neighborhood_demographics (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    neighborhood_id     BIGINT       NOT NULL,
    period              VARCHAR(10)  NOT NULL COMMENT '民國年月，如 11502',
    household_count     INT          NOT NULL DEFAULT 0,
    population_total    INT          NOT NULL DEFAULT 0,
    population_male     INT          NOT NULL DEFAULT 0,
    population_female   INT          NOT NULL DEFAULT 0,
    birth_total         INT          NOT NULL DEFAULT 0,
    birth_male          INT          NOT NULL DEFAULT 0,
    birth_female        INT          NOT NULL DEFAULT 0,
    death_total         INT          NOT NULL DEFAULT 0,
    death_male          INT          NOT NULL DEFAULT 0,
    death_female        INT          NOT NULL DEFAULT 0,
    marry_count         INT          NOT NULL DEFAULT 0,
    divorce_count       INT          NOT NULL DEFAULT 0,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_nh_period (neighborhood_id, period),
    INDEX idx_period (period),
    CONSTRAINT fk_demographics_nh FOREIGN KEY (neighborhood_id) REFERENCES neighborhood(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
