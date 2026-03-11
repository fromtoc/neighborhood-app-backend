package com.example.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.r2")
public class R2Config {
    private String accountId;
    private String accessKeyId;
    private String secretAccessKey;
    private String bucket;
    private String publicBaseUrl;

    public boolean isConfigured() {
        return accountId != null && !accountId.isBlank()
            && accessKeyId != null && !accessKeyId.isBlank()
            && secretAccessKey != null && !secretAccessKey.isBlank();
    }
}
