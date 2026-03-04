package com.example.app.service.impl;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.config.GoogleGeocodingProperties;
import com.example.app.service.GeocodingClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;

/**
 * Google Geocoding API 地址轉座標實作。
 * Bean 由 {@link com.example.app.config.GeocodingClientConfig} 統一管理。
 * API 文件：<a href="https://developers.google.com/maps/documentation/geocoding">
 *     Google Geocoding API</a>
 */
@Slf4j
@RequiredArgsConstructor
public class GoogleGeocodingClientImpl implements GeocodingClient {

    private final GoogleGeocodingProperties properties;
    private final ObjectMapper              objectMapper;

    private final RestClient restClient = RestClient.create();

    @Override
    public double[] geocode(String address) {
        URI uri = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .queryParam("address", address)
                .queryParam("key", properties.getApiKey())
                .queryParam("language", "zh-TW")
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();

        try {
            ResponseEntity<String> response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .toEntity(String.class);

            JsonNode root = objectMapper.readTree(response.getBody());

            String status = root.path("status").asText();
            if ("ZERO_RESULTS".equals(status)) {
                throw new BusinessException(ResultCode.NOT_FOUND, "查無此地址座標");
            }
            if (!"OK".equals(status)) {
                log.warn("Google Geocoding API status={} for address={}", status, address);
                throw new BusinessException(ResultCode.BAD_REQUEST, "地址查詢失敗：" + status);
            }

            JsonNode location = root
                    .path("results").get(0)
                    .path("geometry")
                    .path("location");

            double lat = location.path("lat").asDouble();
            double lng = location.path("lng").asDouble();

            log.debug("Google geocode address={} → lat={}, lng={}", address, lat, lng);
            return new double[]{lat, lng};

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google geocode failed for address={}: {}", address, e.getMessage());
            throw new BusinessException(ResultCode.BAD_REQUEST, "地址查詢失敗");
        }
    }
}
