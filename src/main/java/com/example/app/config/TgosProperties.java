package com.example.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * TGOS 地址查詢服務設定。
 *
 * <p>申請 API Key：<a href="https://api.tgos.tw/">https://api.tgos.tw/</a>
 * <p>啟用方式：設定環境變數 {@code TGOS_API_KEY} 後，在 application.yml 取消 tgos 區塊的註解。
 */
@Data
@Component
@ConfigurationProperties(prefix = "tgos")
public class TgosProperties {

    private String apiKey;
    private String baseUrl = "https://api.tgos.tw/TGOS_API/web/api/SearchAddressInfoByAddress";
}
