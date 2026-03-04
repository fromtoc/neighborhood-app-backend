package com.example.app.config;

import com.example.app.service.GeocodingClient;
import com.example.app.service.impl.GoogleGeocodingClientImpl;
import com.example.app.service.impl.TgosGeocodingClientImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 地址轉座標服務 bean 工廠。
 *
 * <p>優先順序：TGOS &gt; Google。
 * <ul>
 *   <li>設定 {@code tgos.api-key}（環境變數 {@code TGOS_API_KEY}）→ 使用 TGOS</li>
 *   <li>設定 {@code google.geocoding.api-key}（環境變數 {@code GOOGLE_GEOCODING_API_KEY}）→ 使用 Google</li>
 *   <li>兩者皆未設定 → 不建立 bean，地址查詢回傳 503</li>
 * </ul>
 */
@Configuration
public class GeocodingClientConfig {

    /**
     * TGOS 實作：優先；僅在 tgos.api-key 存在時建立。
     */
    @Bean
    @ConditionalOnProperty(name = "tgos.api-key")
    public GeocodingClient tgosGeocodingClient(TgosProperties props, ObjectMapper mapper) {
        return new TgosGeocodingClientImpl(props, mapper);
    }

    /**
     * Google 實作：備用；僅在 google.geocoding.api-key 存在且 TGOS bean 尚未建立時建立。
     */
    @Bean
    @ConditionalOnProperty(name = "google.geocoding.api-key")
    @ConditionalOnMissingBean(GeocodingClient.class)
    public GeocodingClient googleGeocodingClient(GoogleGeocodingProperties props, ObjectMapper mapper) {
        return new GoogleGeocodingClientImpl(props, mapper);
    }
}
