package com.example.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.admin")
public class AdminProperties {

    /**
     * X-Admin-Token header 驗證用的 token。
     * 留空則停用保護（僅限本地開發，正式環境必須設定）。
     */
    private String token = "";
}
