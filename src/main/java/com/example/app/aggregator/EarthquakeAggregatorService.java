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
 * 中央氣象署地震報告爬蟲。
 * E-A0015-001：顯著有感地震（規模 ≥ 4）
 * E-A0016-001：小區域有感地震
 * 每 3 分鐘爬一次，有新報告時發 district_info 給震度 ≥ 2 的縣市。
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.earthquake.enabled", havingValue = "true", matchIfMissing = false)
public class EarthquakeAggregatorService {

    private static final String SOURCE   = "earthquake";
    private static final String URL_SIGNIFICANT =
            "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001" +
            "?Authorization=%s&format=JSON&limit=3";
    private static final String URL_LOCAL =
            "https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0016-001" +
            "?Authorization=%s&format=JSON&limit=3";

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

    @Scheduled(fixedDelayString   = "${aggregator.earthquake.interval-ms:180000}",
               initialDelayString = "${aggregator.earthquake.initial-delay-ms:30000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("Earthquake: system user not found"); return; }
        }
        int created = 0;
        created += processUrl(String.format(URL_SIGNIFICANT, apiKey));
        created += processUrl(String.format(URL_LOCAL, apiKey));
        if (created > 0) log.info("Earthquake crawl done: {} new posts", created);
    }

    private int processUrl(String url) {
        int created = 0;
        try {
            String json = restTemplate.getForObject(url, String.class);
            if (json == null || !json.trim().startsWith("{")) return 0;

            JsonNode root = objectMapper.readTree(json);
            if (!"true".equals(root.path("success").asText())) return 0;

            JsonNode earthquakes = root.path("records").path("Earthquake");
            if (!earthquakes.isArray()) return 0;

            for (JsonNode eq : earthquakes) {
                String eqNo    = eq.path("EarthquakeNo").asText("");
                String eqTime  = eq.path("EarthquakeInfo").path("OriginTime").asText("");
                if (eqNo.isBlank() || eqTime.isBlank()) continue;

                String key = AggregatorSupport.sha256(SOURCE + "::" + eqNo);
                if (support.isAlreadyCrawled(SOURCE, key)) continue;

                JsonNode info     = eq.path("EarthquakeInfo");
                double   magnitude = info.path("EarthquakeMagnitude").path("MagnitudeValue").asDouble(0);
                String   epicenter = info.path("Epicenter").path("Location").asText("");
                double   depth     = info.path("FocalDepth").asDouble(0);

                // 各縣市震度
                JsonNode shaking = eq.path("Intensity").path("ShakingArea");
                List<AreaShaking> areas = parseShaking(shaking);

                if (areas.isEmpty()) { support.markCrawled(SOURCE, key); continue; }

                String title   = buildTitle(magnitude, epicenter);
                String content = buildContent(eqTime, magnitude, epicenter, depth, areas);
                String urgency = magnitude >= 6.0 ? "urgent" : magnitude >= 5.0 ? "medium" : "normal";

                // 對震度 ≥ 2 的縣市發通知（縣市層級 → 所有行政區），nhId 層級去重
                Set<Long> seenNhIds = new LinkedHashSet<>();
                for (AreaShaking area : areas) {
                    if (area.intensity < 2) continue;
                    Set<Long> nhIds = support.resolveAllByCity(area.county, maps);
                    String body = String.format("規模 %.1f，%s震度 %d 級", magnitude, area.county, area.intensity);
                    for (Long nhId : nhIds) {
                        if (!seenNhIds.add(nhId)) continue; // 同一次地震每個 nhId 只發一次
                        Post post = support.buildPost(nhId, systemUserId, "district_info", title, content, urgency);
                        postMapper.insert(post);
                        created++;
                        if (notificationService != null) {
                            notificationService.onNewInfo(nhId, "district_info", post.getId(), title, body);
                        }
                    }
                }
                support.markCrawled(SOURCE, key);
            }
        } catch (Exception e) {
            log.debug("Earthquake crawl error: {}", e.getMessage());
        }
        return created;
    }

    private List<AreaShaking> parseShaking(JsonNode shaking) {
        if (!shaking.isArray()) return List.of();
        // 以 Map 去重：同縣市保留最高震度
        Map<String, Integer> countyMax = new LinkedHashMap<>();
        for (JsonNode area : shaking) {
            String county    = area.path("CountyName").asText("").trim();
            if (county.isBlank()) county = area.path("AreaDesc").asText("").trim();
            String intensStr = area.path("AreaIntensity").asText("0").trim();
            int intens = parseIntensity(intensStr);
            if (county.isBlank()) continue;
            // 合併項目如「苗栗縣、南投縣、臺南市 2 級」需拆開逐一比對
            for (String c : county.split("[、,，]")) {
                c = c.trim();
                if (!c.isBlank()) countyMax.merge(c, intens, Math::max);
            }
        }
        List<AreaShaking> list = new ArrayList<>();
        countyMax.forEach((c, i) -> list.add(new AreaShaking(c, i)));
        return list;
    }

    /** 解析震度字串：「4級」「5弱」「5強」→ 數字 */
    private static int parseIntensity(String s) {
        if (s.isBlank()) return 0;
        try { return Integer.parseInt(s.replaceAll("[^0-9]", "").substring(0, 1)); }
        catch (Exception e) { return 0; }
    }

    private static String buildTitle(double mag, String epicenter) {
        // 取縣市名（epicenter 如「花蓮縣近海」→「花蓮縣」）
        String loc = epicenter.length() > 4 ? epicenter.substring(0, epicenter.indexOf("縣") > 0
                ? epicenter.indexOf("縣") + 1
                : epicenter.indexOf("市") > 0 ? epicenter.indexOf("市") + 1 : 6)
                : epicenter;
        return String.format("【地震報告】規模 %.1f %s地震", mag, loc);
    }

    private static String buildContent(String time, double mag, String epicenter,
                                       double depth, List<AreaShaking> areas) {
        StringBuilder sb = new StringBuilder();
        sb.append("發生時間：").append(formatTime(time)).append("\n");
        sb.append("震　　央：").append(epicenter).append("\n");
        sb.append("規　　模：").append(String.format("%.1f", mag)).append("\n");
        sb.append("深　　度：").append(String.format("%.1f", depth)).append(" 公里\n\n");
        sb.append("各地震度：\n");
        areas.stream()
                .filter(a -> a.intensity > 0)
                .sorted((a, b) -> b.intensity - a.intensity)
                .forEach(a -> sb.append("・").append(a.county)
                        .append(" ").append(a.intensity).append(" 級\n"));
        return sb.toString().trim();
    }

    private static String formatTime(String s) {
        // "2026-03-10 14:35:00" or "2026-03-10T14:35:00"
        return s.replace("T", " ").replaceAll("\\+.*", "");
    }

    private record AreaShaking(String county, int intensity) {}
}
