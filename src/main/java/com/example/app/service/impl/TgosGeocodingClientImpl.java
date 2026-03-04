package com.example.app.service.impl;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.config.TgosProperties;
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
 * TGOS 地址查詢服務實作。
 * Bean 由 {@link com.example.app.config.GeocodingClientConfig} 統一管理。
 * 官方文件：<a href="https://api.tgos.tw/">https://api.tgos.tw/</a>
 */
@Slf4j
@RequiredArgsConstructor
public class TgosGeocodingClientImpl implements GeocodingClient {

    private final TgosProperties tgosProperties;
    private final ObjectMapper   objectMapper;

    private final RestClient restClient = RestClient.create();

    @Override
    public double[] geocode(String address) {
        URI uri = UriComponentsBuilder.fromHttpUrl(tgosProperties.getBaseUrl())
                .queryParam("APIKey", tgosProperties.getApiKey())
                .queryParam("ADDRESSID", address)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();

        try {
            ResponseEntity<String> response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .toEntity(String.class);

            JsonNode root = objectMapper.readTree(response.getBody());

            // TGOS response: { "RESULTS": [ { "x": lng, "y": lat, ... } ] }
            JsonNode results = root.path("RESULTS");
            if (results.isMissingNode() || results.isEmpty()) {
                throw new BusinessException(ResultCode.NOT_FOUND, "查無此地址座標");
            }

            JsonNode first = results.get(0);
            double lng = first.path("x").asDouble();
            double lat = first.path("y").asDouble();

            log.debug("TGOS geocode address={} → lat={}, lng={}", address, lat, lng);
            return new double[]{lat, lng};

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("TGOS geocode failed for address={}: {}", address, e.getMessage());
            throw new BusinessException(ResultCode.BAD_REQUEST, "地址查詢失敗");
        }
    }
}
