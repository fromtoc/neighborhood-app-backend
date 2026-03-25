package com.example.app.aggregator;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.NeighborhoodDemographics;
import com.example.app.mapper.NeighborhoodDemographicsMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DemographicsAggregatorService {

    private final NeighborhoodMapper neighborhoodMapper;
    private final NeighborhoodDemographicsMapper demographicsMapper;
    private final ObjectMapper objectMapper;

    private static final String RIS_API = "https://www.ris.gov.tw/rs-opendata/api/v1/datastore/ODRP061/";
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(30))
            .build();

    /**
     * 每天凌晨 3 點抓取最新戶政資料
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void scheduledFetch() {
        String period = currentRocPeriod();
        log.info("[Demographics] 開始抓取戶政資料，期別: {}", period);
        try {
            int count = fetchAndStore(period);
            log.info("[Demographics] 完成，共更新 {} 筆", count);
        } catch (Exception e) {
            log.error("[Demographics] 抓取失敗: {}", e.getMessage(), e);
            // 如果當月還沒有資料，嘗試上個月
            String prevPeriod = previousRocPeriod();
            log.info("[Demographics] 嘗試上期: {}", prevPeriod);
            try {
                int count = fetchAndStore(prevPeriod);
                log.info("[Demographics] 上期完成，共更新 {} 筆", count);
            } catch (Exception e2) {
                log.error("[Demographics] 上期也失敗: {}", e2.getMessage());
            }
        }
    }

    @Transactional
    public int fetchAndStore(String period) {
        // 1. 建立 neighborhood 查詢索引：city+district+name → id
        List<Neighborhood> neighborhoods = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>().eq(Neighborhood::getStatus, 1));
        Map<String, Long> nhIndex = new HashMap<>();
        for (Neighborhood nh : neighborhoods) {
            String key = nh.getCity() + nh.getDistrict() + nh.getName();
            nhIndex.put(key, nh.getId());
        }

        // 2. 抓取 RIS API（可能需要分頁）
        int updated = 0;
        int page = 1;
        while (true) {
            String url = RIS_API + period + "?page=" + page;
            String json = httpGet(url);
            if (json == null) break;

            try {
                JsonNode root = objectMapper.readTree(json);
                JsonNode records = root.has("responseData") ? root.get("responseData") : null;
                if (records == null || !records.isArray() || records.isEmpty()) break;

                for (JsonNode record : records) {
                    String siteId = textOrNull(record, "site_id"); // e.g. "新北市板橋區"
                    String village = textOrNull(record, "village"); // e.g. "留侯里"
                    if (siteId == null || village == null) continue;

                    // 解析 city + district
                    String city = null;
                    String district = null;
                    for (String[] aliases : AggregatorSupport.COUNTY_ALIASES) {
                        for (String alias : aliases) {
                            if (siteId.startsWith(alias)) {
                                city = aliases[0]; // 正規化城市名
                                district = siteId.substring(alias.length());
                                break;
                            }
                        }
                        if (city != null) break;
                    }
                    if (city == null) continue;

                    // 比對 neighborhood
                    String key = city + district + village;
                    Long nhId = nhIndex.get(key);
                    if (nhId == null) {
                        // 嘗試不帶正規化的城市名
                        key = siteId + village;
                        // 直接用 siteId 中的前綴匹配
                        for (Map.Entry<String, Long> entry : nhIndex.entrySet()) {
                            if (entry.getKey().endsWith(district + village)) {
                                nhId = entry.getValue();
                                break;
                            }
                        }
                    }
                    if (nhId == null) continue;

                    // 寫入或更新
                    upsert(nhId, period, record);
                    updated++;
                }

                if (records.size() < 2000) break; // 最後一頁
                page++;
            } catch (Exception e) {
                log.error("[Demographics] 解析第 {} 頁失敗: {}", page, e.getMessage());
                break;
            }
        }

        return updated;
    }

    private void upsert(Long nhId, String period, JsonNode record) {
        NeighborhoodDemographics existing = demographicsMapper.selectOne(
                new LambdaQueryWrapper<NeighborhoodDemographics>()
                        .eq(NeighborhoodDemographics::getNeighborhoodId, nhId)
                        .eq(NeighborhoodDemographics::getPeriod, period));

        NeighborhoodDemographics demo = existing != null ? existing : new NeighborhoodDemographics();
        demo.setNeighborhoodId(nhId);
        demo.setPeriod(period);
        demo.setHouseholdCount(intVal(record, "household_no"));
        demo.setPopulationTotal(intVal(record, "people_total"));
        demo.setPopulationMale(intVal(record, "people_total_m"));
        demo.setPopulationFemale(intVal(record, "people_total_f"));
        demo.setBirthTotal(intVal(record, "birth_total"));
        demo.setBirthMale(intVal(record, "birth_total_m"));
        demo.setBirthFemale(intVal(record, "birth_total_f"));
        demo.setDeathTotal(intVal(record, "death_m") + intVal(record, "death_f"));
        demo.setDeathMale(intVal(record, "death_m"));
        demo.setDeathFemale(intVal(record, "death_f"));
        demo.setMarryCount(intVal(record, "marry_pair_OppositeSex") + intVal(record, "marry_pair_SameSex"));
        demo.setDivorceCount(intVal(record, "divorce_pair_OppositeSex") + intVal(record, "divorce_pair_SameSex"));

        if (existing != null) {
            demographicsMapper.updateById(demo);
        } else {
            demographicsMapper.insert(demo);
        }
    }

    private String httpGet(String url) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(java.time.Duration.ofSeconds(30))
                    .GET().build();
            HttpResponse<String> resp = HTTP_CLIENT.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                log.warn("[Demographics] HTTP {}: {}", resp.statusCode(), url);
                return null;
            }
            return resp.body();
        } catch (Exception e) {
            log.error("[Demographics] HTTP GET 失敗: {} - {}", url, e.getMessage());
            return null;
        }
    }

    private String textOrNull(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v != null && !v.isNull() ? v.asText() : null;
    }

    private int intVal(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) return 0;
        try {
            return Integer.parseInt(v.asText().trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** 當前民國年月，如 "11503" */
    private String currentRocPeriod() {
        LocalDate now = LocalDate.now();
        int rocYear = now.getYear() - 1911;
        return String.format("%d%02d", rocYear, now.getMonthValue());
    }

    /** 上個月的民國年月 */
    private String previousRocPeriod() {
        LocalDate prev = LocalDate.now().minusMonths(1);
        int rocYear = prev.getYear() - 1911;
        return String.format("%d%02d", rocYear, prev.getMonthValue());
    }
}
