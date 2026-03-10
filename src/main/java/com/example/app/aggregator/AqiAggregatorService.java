package com.example.app.aggregator;

import com.example.app.entity.Post;
import com.example.app.mapper.PostMapper;
import com.example.app.service.NotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * 行政院環保署 AQI 空氣品質爬蟲。
 * AQI >= 100（對敏感族群不健康）才發通知。
 * 以測站縣市 + 測站名稱比對行政區，發 district_info。
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.aqi.enabled", havingValue = "true", matchIfMissing = false)
public class AqiAggregatorService {

    private static final String SOURCE = "aqi";

    private final RestTemplate      restTemplate;
    private final ObjectMapper      objectMapper;
    private final AggregatorSupport support;
    private final PostMapper        postMapper;

    @Value("${aggregator.aqi.api-key:9be7b239-557b-4c10-9775-78cadfc555e7}")
    private String apiKey;

    @Autowired(required = false)
    private NotificationService notificationService;

    private Long systemUserId;
    private AggregatorSupport.NeighborhoodMaps maps;

    @PostConstruct
    public void init() {
        systemUserId = support.loadSystemUserId();
        maps = support.loadMaps();
    }

    @Scheduled(fixedDelayString    = "${aggregator.aqi.interval-ms:3600000}",
               initialDelayString  = "${aggregator.aqi.initial-delay-ms:60000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("AQI: system user not found, skip"); return; }
        }
        try {
            String url  = "https://data.moenv.gov.tw/api/v2/aqx_p_432?format=JSON&limit=1000&api_key=" + apiKey;
            String json = restTemplate.getForObject(url, String.class);
            if (json == null || !json.trim().startsWith("{")) {
                log.warn("AQI: unexpected response (API key may be invalid): {}", json);
                return;
            }
            // 新版 moenv API 直接回傳陣列，欄位為小寫
            JsonNode root2 = objectMapper.readTree(json);
            JsonNode records = root2.isArray() ? root2 : root2.path("records");
            if (!records.isArray()) return;

            int created = 0;
            for (JsonNode r : records) {
                int aqi = parseInt(r.path("aqi").asText("0"));
                if (aqi < 100) continue;   // AQI < 100 良好/普通，不通知

                String county    = r.path("county").asText("").trim();
                String siteName  = r.path("sitename").asText("").trim();
                String status    = r.path("status").asText("").trim();
                String pm25      = r.path("pm2.5").asText("").trim();
                String pm10      = r.path("pm10").asText("").trim();
                String pollutant = r.path("pollutant").asText("").trim();
                String pubTime   = r.path("publishtime").asText("").trim();
                if (county.isBlank() || pubTime.isBlank()) continue;

                // 以小時+AQI等級去重
                String hour = pubTime.length() >= 13 ? pubTime.substring(0, 13) : pubTime;
                String key  = AggregatorSupport.sha256(SOURCE + "::" + county + "::" + siteName + "::" + hour + "::" + aqiLevel(aqi));
                if (support.isAlreadyCrawled(SOURCE, key)) continue;

                // 比對行政區（測站名稱通常等於鄉鎮區名）
                Long nhId = resolveDistrictNhId(county, siteName);
                if (nhId == null) { support.markCrawled(SOURCE, key); continue; }

                String title   = String.format("【空氣品質】%s%s AQI %d（%s）", county, siteName, aqi, status);
                String content = buildContent(aqi, status, pm25, pm10, pollutant);
                String urgency = aqi >= 200 ? "urgent" : aqi >= 150 ? "medium" : "normal";

                Post post = support.buildPost(nhId, systemUserId, "district_info", title, content, urgency);
                postMapper.insert(post);
                created++;
                if (notificationService != null) {
                    String body = content.length() > 80 ? content.substring(0, 80) + "…" : content;
                    notificationService.onNewInfo(nhId, "district_info", post.getId(), title, body);
                }
                support.markCrawled(SOURCE, key);
            }
            log.info("AQI crawl done: {} new posts", created);
        } catch (Exception e) {
            log.error("AQI crawl failed", e);
        }
    }

    /** 測站名稱（汐止）比對行政區（汐止區），回傳代表里的 nhId */
    private Long resolveDistrictNhId(String county, String siteName) {
        for (Map.Entry<String, Long> e : maps.districtMap().entrySet()) {
            String[] parts = e.getKey().split("@@");
            if (parts[0].equals(county) && parts[1].startsWith(siteName))
                return e.getValue();
        }
        return null;
    }

    private static int parseInt(String s) {
        try { return Integer.parseInt(s.trim()); } catch (Exception e) { return 0; }
    }

    private static String aqiLevel(int aqi) {
        if (aqi >= 200) return "very_unhealthy";
        if (aqi >= 150) return "unhealthy";
        return "sensitive";
    }

    private static String buildContent(int aqi, String status, String pm25, String pm10, String pollutant) {
        StringBuilder sb = new StringBuilder();
        sb.append("AQI：").append(aqi).append("（").append(status).append("）\n");
        if (!pm25.isBlank())      sb.append("PM2.5：").append(pm25).append(" μg/m³\n");
        if (!pm10.isBlank())      sb.append("PM10：").append(pm10).append(" μg/m³\n");
        if (!pollutant.isBlank()) sb.append("主要污染物：").append(pollutant).append("\n\n");
        if (aqi >= 200)
            sb.append("建議：所有人應避免戶外活動，外出請配戴口罩。");
        else if (aqi >= 150)
            sb.append("建議：一般民眾減少長時間戶外活動，敏感族群留在室內。");
        else
            sb.append("建議：敏感族群（氣喘、心肺疾病、老人、孩童）應減少戶外活動。");
        return sb.toString();
    }
}
