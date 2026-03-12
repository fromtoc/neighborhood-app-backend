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
 * 中央氣象署（CWA）氣象特報爬蟲。
 * 資料集 W-C0033-001：颱風、豪雨、大雨、強風、低溫等特報。
 * 比對 affectedAreas → locationName 對應縣市，發 district_info。
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.cwa-alert.enabled", havingValue = "true", matchIfMissing = false)
public class CwaAlertAggregatorService {

    private static final String SOURCE   = "cwa_alert";
    private static final String BASE_URL =
            "https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001" +
            "?Authorization=%s&format=JSON&lang=zh-tw";

    private final RestTemplate      restTemplate;
    private final ObjectMapper      objectMapper;
    private final AggregatorSupport support;
    private final PostMapper        postMapper;

    @Value("${cwa.api-key:CWA-000248A6-64BE-4F2D-B284-DC2E4E9EAE2D}")
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

    @Scheduled(fixedDelayString   = "${aggregator.cwa-alert.interval-ms:1800000}",
               initialDelayString = "${aggregator.cwa-alert.initial-delay-ms:45000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("CWA-Alert: system user not found, skip"); return; }
        }
        try {
            String url  = String.format(BASE_URL, apiKey);
            String json = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(json);
            if (!"true".equals(root.path("success").asText())) return;

            // records.location[] - 每個縣市的特報狀態
            JsonNode locations = root.path("records").path("location");
            if (!locations.isArray()) return;

            int created = 0;
            for (JsonNode loc : locations) {
                String locationName = loc.path("locationName").asText("").trim(); // e.g. 臺北市
                // API 回傳 hazards 直接是陣列，不是 hazards.hazard
                JsonNode hazards    = loc.path("hazardConditions").path("hazards");
                if (!hazards.isArray()) continue;

                for (JsonNode hazard : hazards) {
                    JsonNode info       = hazard.path("info");
                    String phenomena    = info.path("phenomena").asText("").trim();
                    String significance = info.path("significance").asText("").trim();
                    String startTime   = hazard.path("validTime").path("startTime").asText("");
                    String endTime     = hazard.path("validTime").path("endTime").asText("");

                    if (phenomena.isBlank()) continue;

                    String key = AggregatorSupport.sha256(SOURCE + "::" + locationName + "::" + phenomena + "::" + startTime);
                    if (support.isAlreadyCrawled(SOURCE, key)) continue;

                    // 氣象特報為縣市層級，但只收集里/區資訊 → 嘗試用 resolveTargets 比對
                    String geoText = locationName + " " + phenomena;
                    Set<Long> nhIds = support.resolveTargets(geoText, maps);
                    if (nhIds.isEmpty()) { support.markCrawled(SOURCE, key); continue; }

                    String title   = String.format("【氣象%s】%s %s%s", significance, locationName, phenomena, significance);
                    String content = buildContent(phenomena, significance, locationName, startTime, endTime);
                    String urgency = resolveUrgency(phenomena);

                    for (Long nhId : nhIds) {
                        Post post = support.buildPost(nhId, systemUserId, "district_info", title, content, urgency);
                        postMapper.insert(post);
                        created++;
                        if (notificationService != null) {
                            notificationService.onNewInfo(nhId, "district_info", post.getId(), title,
                                    content.length() > 80 ? content.substring(0, 80) + "…" : content);
                        }
                    }
                    support.markCrawled(SOURCE, key);
                }
            }
            log.info("CWA-Alert crawl done: {} new posts", created);
        } catch (Exception e) {
            log.error("CWA-Alert crawl failed", e);
        }
    }

    private static String resolveUrgency(String phenomena) {
        if (phenomena.contains("颱風") || phenomena.contains("海嘯") || phenomena.contains("地震")) return "urgent";
        if (phenomena.contains("豪雨") || phenomena.contains("大雨") || phenomena.contains("強風")) return "medium";
        return "normal";
    }

    private static String buildContent(String phenomena, String significance,
                                       String area, String startTime, String endTime) {
        StringBuilder sb = new StringBuilder();
        sb.append("中央氣象署發布").append(area).append(phenomena).append(significance).append("。\n\n");
        if (!startTime.isBlank()) sb.append("生效時間：").append(formatTime(startTime)).append("\n");
        if (!endTime.isBlank())   sb.append("解除時間：").append(formatTime(endTime)).append("\n\n");
        sb.append("請民眾注意安全，做好防災準備。");
        return sb.toString();
    }

    private static String formatTime(String s) {
        // API 回傳格式："2026-03-10 10:32:00"
        try {
            java.time.LocalDateTime ldt = java.time.LocalDateTime.parse(
                    s, java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            int h = ldt.getHour();
            String ampm = h < 12 ? "上午" : "下午";
            int h12 = h % 12 == 0 ? 12 : h % 12;
            return ldt.getMonthValue() + "/" + ldt.getDayOfMonth() + " " + ampm + h12 + ":" +
                    String.format("%02d", ldt.getMinute());
        } catch (Exception e) {
            return s;
        }
    }
}
