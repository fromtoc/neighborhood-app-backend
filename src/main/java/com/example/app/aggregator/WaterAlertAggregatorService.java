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

import java.util.Set;

/**
 * 經濟部水利署 水情燈號爬蟲。
 * 當地區出現「減壓供水」（黃燈）以上水情時發出通知。
 * API：https://water.nlmoea.gov.tw/api/waterSituation
 * 回應格式：[{ "county": "桃園市", "statusCode": 2, "statusName": "減壓供水", ... }]
 *
 * statusCode：1=正常, 2=減壓供水, 3=供5停2, 4=供5停3, 5=停水
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.water-alert.enabled", havingValue = "true", matchIfMissing = false)
public class WaterAlertAggregatorService {

    private static final String SOURCE  = "water_alert";
    // 經濟部水利署開放資料 — 全台各供水區水情燈號
    private static final String API_URL =
            "https://opendata.wra.gov.tw/Service/OpenData.aspx?format=json&id=27&$top=100";

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

    @Scheduled(fixedDelayString   = "${aggregator.water-alert.interval-ms:10800000}",
               initialDelayString = "${aggregator.water-alert.initial-delay-ms:90000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("WaterAlert: system user not found, skip"); return; }
        }
        try {
            String json = restTemplate.getForObject(API_URL, String.class);
            JsonNode items = objectMapper.readTree(json);
            if (!items.isArray()) return;

            int created = 0;
            for (JsonNode item : items) {
                int    statusCode = item.path("statusCode").asInt(1);
                if (statusCode <= 1) continue;   // 正常供水，不通知

                String county     = item.path("county").asText("").trim();
                String statusName = item.path("statusName").asText("").trim();
                String date       = item.path("date").asText("").trim();      // 公告日期
                String note       = item.path("note").asText("").trim();

                if (county.isBlank()) continue;

                String key = AggregatorSupport.sha256(SOURCE + "::" + county + "::" + statusCode + "::" + date);
                if (support.isAlreadyCrawled(SOURCE, key)) continue;

                // 只收集里/區資訊，僅匹配縣市則過濾掉
                Set<Long> nhIds = support.resolveTargets(county + " " + note, maps);
                if (nhIds.isEmpty()) { support.markCrawled(SOURCE, key); continue; }

                String title   = String.format("【水情公告】%s %s", county, statusName);
                String content = buildContent(county, statusName, statusCode, date, note);
                String urgency = statusCode >= 4 ? "urgent" : statusCode >= 2 ? "medium" : "normal";

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
            log.info("WaterAlert crawl done: {} new posts", created);
        } catch (Exception e) {
            log.error("WaterAlert crawl failed", e);
        }
    }

    private static String buildContent(String county, String statusName, int code,
                                       String date, String note) {
        StringBuilder sb = new StringBuilder();
        sb.append(county).append("目前水情：").append(statusName).append("。\n\n");
        if (code == 2) sb.append("自來水公司將降低管線水壓，高樓層用戶可能水量不足，建議提前儲水。\n");
        if (code == 3) sb.append("每週供水五天、停水兩天，請民眾提前儲備用水。\n");
        if (code == 4) sb.append("每週供水五天、停水三天，請民眾提前儲備用水。\n");
        if (code == 5) sb.append("目前停止供水，請依公告時程備水。\n");
        if (!note.isBlank())  sb.append("\n說明：").append(note).append("\n");
        if (!date.isBlank())  sb.append("公告日期：").append(date);
        return sb.toString();
    }
}
