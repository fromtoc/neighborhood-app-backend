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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * 台北市開放資料 — 里辦公室活動爬蟲。
 * API：台北市政府開放資料平台，里辦公室活動資料集。
 * 資料集 ID：5a0e5fbb-72f8-41c6-908e-2fb25eff9b8a
 *
 * 欄位：活動名稱 / 活動時間 / 地點 / 主辦里 / 說明
 * 比對里名稱 → 發 li_info 給該里。
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.taipei-event.enabled", havingValue = "true", matchIfMissing = false)
public class TaipeiEventAggregatorService {

    private static final String SOURCE  = "taipei_event";
    private static final String API_URL =
            "https://data.taipei.gov.tw/api/v1/dataset/5a0e5fbb-72f8-41c6-908e-2fb25eff9b8a" +
            "?scope=resourceAquire&format=json&limit=50";

    private final RestTemplate      restTemplate;
    private final ObjectMapper      objectMapper;
    private final AggregatorSupport support;
    private final PostMapper        postMapper;

    @Autowired(required = false)
    private NotificationService notificationService;

    private Long systemUserId;
    private AggregatorSupport.NeighborhoodMaps maps;

    @PostConstruct
    public void init() {
        systemUserId = support.loadSystemUserId();
        maps = support.loadMaps();
    }

    @Scheduled(fixedDelayString   = "${aggregator.taipei-event.interval-ms:21600000}",
               initialDelayString = "${aggregator.taipei-event.initial-delay-ms:150000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("TaipeiEvent: system user not found, skip"); return; }
        }
        try {
            String json = restTemplate.getForObject(API_URL, String.class);
            JsonNode root = objectMapper.readTree(json);

            // 台北市開放資料平台回傳格式：{ "result": { "results": [...] } }
            JsonNode records = root.path("result").path("results");
            if (!records.isArray()) return;

            int created = 0;
            for (JsonNode r : records) {
                String eventName = getText(r, "活動名稱", "title", "EventName");
                String eventTime = getText(r, "活動時間", "date", "EventTime", "startDate");
                String location  = getText(r, "地點", "location", "Location");
                String liName    = getText(r, "主辦里", "village", "VillageName", "里別");
                String desc      = getText(r, "說明", "content", "Description", "內容");
                String district  = getText(r, "行政區", "district", "District", "區別");

                if (eventName.isBlank()) continue;

                String key = AggregatorSupport.sha256(SOURCE + "::" + eventName + "::" + eventTime + "::" + liName);
                if (support.isAlreadyCrawled(SOURCE, key)) continue;

                // 優先比對里名，fallback 行政區
                Long nhId = resolveNhId("臺北市", district, liName);
                if (nhId == null) { support.markCrawled(SOURCE, key); continue; }

                String title   = "【里活動】" + eventName;
                String content = buildContent(eventName, eventTime, location, liName, desc);

                Post post = support.buildPost(nhId, systemUserId, "li_info", title, content, "normal");
                postMapper.insert(post);
                created++;
                if (notificationService != null) {
                    notificationService.onNewInfo(nhId, "li_info", post.getId(), title,
                            content.length() > 80 ? content.substring(0, 80) + "…" : content);
                }
                support.markCrawled(SOURCE, key);
            }
            log.info("TaipeiEvent crawl done: {} new posts", created);
        } catch (Exception e) {
            log.error("TaipeiEvent crawl failed", e);
        }
    }

    /** 嘗試多個可能的欄位名稱，回傳第一個非空值 */
    private static String getText(JsonNode node, String... fields) {
        for (String f : fields) {
            String v = node.path(f).asText("").trim();
            if (!v.isBlank()) return v;
        }
        return "";
    }

    private Long resolveNhId(String city, String district, String liName) {
        // 1. 嘗試完整比對：city + district + liName
        if (!district.isBlank() && !liName.isBlank()) {
            // liName 可能是「大安里」或「大安」
            String fullKey1 = city + district + "區" + liName + "里";
            String fullKey2 = city + district + "區" + liName;
            Long id = maps.fullNameMap().get(fullKey1);
            if (id == null) id = maps.fullNameMap().get(fullKey2);
            if (id != null) return id;
        }
        // 2. 比對行政區
        if (!district.isBlank()) {
            String distKey = city + "@@" + district + "區";
            Long id = maps.districtMap().get(distKey);
            if (id != null) return id;
            // 有些不帶「區」
            for (Map.Entry<String, Long> e : maps.districtMap().entrySet()) {
                if (e.getKey().startsWith(city + "@@") && e.getKey().contains(district))
                    return e.getValue();
            }
        }
        return null;
    }

    private static String buildContent(String name, String time, String location,
                                       String liName, String desc) {
        StringBuilder sb = new StringBuilder();
        if (!time.isBlank())     sb.append("時間：").append(time).append("\n");
        if (!location.isBlank()) sb.append("地點：").append(location).append("\n");
        if (!liName.isBlank())   sb.append("主辦：").append(liName).append("\n");
        if (!desc.isBlank())     sb.append("\n").append(desc);
        return sb.toString().trim();
    }
}
