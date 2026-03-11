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

import java.util.*;


/**
 * 疾管署登革熱病例聚集區域爬蟲。
 * 資料來源：od.cdc.gov.tw（直接 GeoJSON）
 * 有聚集區域時每週發一次 district_info。
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.cdc-alert.enabled", havingValue = "true", matchIfMissing = false)
public class CdcAlertAggregatorService {

    private static final String SOURCE = "cdc_alert";

    private static final String[][] COUNTY_URLS = {
        {"臺南市", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_Tainan.json"},
        {"高雄市", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_Kaohsiung.json"},
        {"屏東縣", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_Pingtung.json"},
        {"臺北市", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_Taipei.json"},
        {"新北市", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_NewTaipei.json"},
        {"臺中市", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_Taichung.json"},
        {"桃園市", "https://od.cdc.gov.tw/eic/DengueCluster/DengueCluster_Taoyuan.json"},
    };

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

    @Scheduled(fixedDelayString   = "${aggregator.cdc-alert.interval-ms:21600000}",
               initialDelayString = "${aggregator.cdc-alert.initial-delay-ms:120000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("CDC-Alert: system user not found, skip"); return; }
        }
        int created = 0;
        for (String[] entry : COUNTY_URLS) {
            String county = entry[0];
            String url    = entry[1];
            try {
                String json = restTemplate.getForObject(url, String.class);
                if (json == null) continue;

                JsonNode features = objectMapper.readTree(json).path("features");
                if (!features.isArray() || features.size() == 0) continue; // 本週無聚集

                // 以週次 + 聚集數量去重
                String weekKey = getWeekKey();
                String key = AggregatorSupport.sha256(SOURCE + "::" + county + "::" + weekKey + "::" + features.size());
                if (support.isAlreadyCrawled(SOURCE, key)) continue;

                // 彙整區域說明，並收集所有 TOWN_NAME 供地理比對
                StringBuilder areas = new StringBuilder();
                StringBuilder geoText = new StringBuilder(county).append(" ");
                for (JsonNode feat : features) {
                    JsonNode props   = feat.path("properties");
                    String district  = getField(props, "TOWN_NAME", "行政區", "district");
                    String village   = getField(props, "VILL_NAME", "村里", "village");
                    String casesStr  = getField(props, "CASE_COUNT", "病例數", "cases");
                    if (!district.isBlank()) { areas.append("・").append(district); geoText.append(district).append(" "); }
                    if (!village.isBlank())  { areas.append(village); geoText.append(village).append(" "); }
                    if (!casesStr.isBlank()) areas.append("（").append(casesStr).append("例）");
                    areas.append("\n");
                }

                // 里 > 區 > 縣市優先比對（TOWN_NAME 通常能精確到行政區）
                Set<Long> nhIds = support.resolveTargets(geoText.toString(), maps);
                if (nhIds.isEmpty()) { support.markCrawled(SOURCE, key); continue; }

                String title   = String.format("【疾管署】%s 近兩週登革熱病例聚集（%d處）", county, features.size());
                String content = "以下區域近兩週有登革熱病例聚集，請清除積水、注意防蚊：\n\n"
                        + areas + "\n來源：衛生福利部疾病管制署";
                String notifyBody = county + " 近兩週有 " + features.size() + " 處登革熱病例聚集，請注意防蚊。";

                for (Long nhId : nhIds) {
                    Post post = support.buildPost(nhId, systemUserId, "district_info", title, content, "medium");
                    postMapper.insert(post);
                    created++;
                    if (notificationService != null) {
                        notificationService.onNewInfo(nhId, "district_info", post.getId(), title, notifyBody);
                    }
                }
                support.markCrawled(SOURCE, key);

            } catch (Exception e) {
                log.warn("CDC-Alert: failed county={}", county, e);
            }
        }
        log.info("CDC-Alert crawl done: {} new posts", created);
    }

    private static String getField(JsonNode node, String... keys) {
        for (String k : keys) {
            String v = node.path(k).asText("").trim();
            if (!v.isBlank()) return v;
        }
        return "";
    }

    private static String getWeekKey() {
        java.time.LocalDate today = java.time.LocalDate.now();
        int week = today.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        return today.getYear() + "-W" + week;
    }
}
