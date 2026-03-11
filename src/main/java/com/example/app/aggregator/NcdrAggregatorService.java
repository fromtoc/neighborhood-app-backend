package com.example.app.aggregator;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 定時從 NCDR 防災資訊 Feed 抓取警報。
 * - 每筆 JSON entry 對應一個 CAP XML 檔，CAP 內有精確到里的 <area> 資訊
 * - 比對到 DB 里名稱 → 發 li_info；只比對到區 → 發 district_info
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "aggregator.ncdr.enabled", havingValue = "true", matchIfMissing = false)
public class NcdrAggregatorService {

    private static final String SOURCE   = "ncdr";
    private static final String FEED_URL = "https://alerts.ncdr.nat.gov.tw/JSONAtomFeed.ashx";

    private final RestTemplate       restTemplate;
    private final ObjectMapper       objectMapper;
    private final AggregatorSupport  support;
    private final PostMapper         postMapper;

    @Autowired(required = false)
    private NotificationService notificationService;

    private Long systemUserId;
    private AggregatorSupport.NeighborhoodMaps maps;

    @PostConstruct
    public void init() {
        systemUserId = support.loadSystemUserId();
        maps = support.loadMaps();
    }

    @Scheduled(fixedDelayString = "${aggregator.ncdr.interval-ms:300000}",
               initialDelayString = "${aggregator.ncdr.initial-delay-ms:5000}")
    public void crawl() {
        if (systemUserId == null) {
            systemUserId = support.loadSystemUserId();
            if (systemUserId == null) { log.warn("NCDR: system user not found, skip"); return; }
        }

        try {
            String json = restTemplate.getForObject(FEED_URL, String.class);
            JsonNode root = objectMapper.readTree(json);
            JsonNode entries = root.path("entry");
            if (!entries.isArray()) return;

            // 依 CAP id 分組，每個唯一 CAP 只抓一次
            Map<String, String> idToCapUrl = new LinkedHashMap<>();
            for (JsonNode entry : entries) {
                String id     = entry.path("id").asText();
                String capUrl = entry.path("link").path("@href").asText();
                if (!capUrl.isBlank()) idToCapUrl.putIfAbsent(id, capUrl);
            }

            int created = 0;
            for (Map.Entry<String, String> e : idToCapUrl.entrySet()) {
                created += processCapFile(e.getKey(), e.getValue());
            }
            log.info("NCDR crawl done: {} new posts created", created);
        } catch (Exception e) {
            log.error("NCDR crawl failed", e);
        }
    }

    private int processCapFile(String capId, String capUrl) {
        byte[] xmlBytes;
        try {
            xmlBytes = restTemplate.getForObject(capUrl, byte[].class);
            if (xmlBytes == null || xmlBytes.length == 0) return 0;
        } catch (Exception e) {
            log.debug("NCDR: failed to fetch CAP {}", capUrl, e);
            return 0;
        }

        Document doc;
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            doc = builder.parse(new ByteArrayInputStream(xmlBytes));
        } catch (Exception e) {
            log.debug("NCDR: failed to parse CAP XML for {}", capId, e);
            return 0;
        }

        NodeList infoList = doc.getElementsByTagName("info");
        int created = 0;
        // 跨 info block 去重：同一個 CAP 裡同一個 nhId+type 只建一篇
        Set<String> capSeenNh = new LinkedHashSet<>();

        for (int i = 0; i < infoList.getLength(); i++) {
            Element info = (Element) infoList.item(i);

            String event       = text(info, "event");
            String description = text(info, "description");
            String headline    = text(info, "headline");
            String expires     = text(info, "expires");
            String senderName  = text(info, "senderName");
            String urgency     = text(info, "urgency");

            if (description.isBlank()) continue;

            // 去重 key：cap identifier + 第 i 個 info block 的 description
            String key = AggregatorSupport.sha256(capId + "@@" + i + "@@" + description);
            if (support.isAlreadyCrawled(SOURCE, key)) continue;

            // 解析所有 <area> 元素，比對里名稱
            NodeList areaList = info.getElementsByTagName("area");
            List<MatchedArea> matched = new ArrayList<>();

            for (int j = 0; j < areaList.getLength(); j++) {
                Element area    = (Element) areaList.item(j);
                String areaDesc = text(area, "areaDesc");

                Long nhId = maps.fullNameMap().get(areaDesc);
                if (nhId != null) {
                    matched.add(new MatchedArea(nhId, "li_info"));
                    continue;
                }
                // 嘗試比對 city+district（截取前兩段）
                for (Map.Entry<String, Long> de : maps.districtMap().entrySet()) {
                    String[] parts      = de.getKey().split("@@");
                    String cityDistrict = parts[0] + parts[1];
                    if (areaDesc.startsWith(cityDistrict)) {
                        matched.add(new MatchedArea(de.getValue(), "district_info"));
                        break;
                    }
                }
            }

            if (matched.isEmpty()) {
                support.markCrawled(SOURCE, key);
                continue;
            }

            // 去重：同一個 nhId+type，整個 CAP 只建一篇（避免多個 info block 重複）
            String title = headline.isBlank() ? event : headline;
            String content = buildContent(description, expires, senderName);
            String urgencyVal = resolveUrgency(urgency, event);

            for (MatchedArea m : matched) {
                String dedup = m.nhId + ":" + m.type;
                if (!capSeenNh.add(dedup)) continue;

                // 同里+同標題在近 30 天內已有系統貼文 → 更新內容，不重複新增
                Post existing = postMapper.selectOne(
                        new LambdaQueryWrapper<Post>()
                                .eq(Post::getNeighborhoodId, m.nhId)
                                .eq(Post::getUserId, systemUserId)
                                .eq(Post::getTitle, title)
                                .eq(Post::getType, m.type)
                                .ge(Post::getCreatedAt, LocalDateTime.now().minusDays(30))
                                .last("LIMIT 1"));
                if (existing != null) {
                    existing.setContent(content);
                    existing.setUrgency(urgencyVal);
                    postMapper.updateById(existing);
                } else {
                    Post post = support.buildPost(m.nhId, systemUserId, m.type, title, content, urgencyVal);
                    postMapper.insert(post);
                    created++;
                    if (notificationService != null) {
                        String body = description.length() > 80 ? description.substring(0, 80) + "…" : description;
                        notificationService.onNewInfo(m.nhId, m.type, post.getId(), title, body);
                    }
                }
            }

            support.markCrawled(SOURCE, key);
        }

        return created;
    }

    private record MatchedArea(Long nhId, String type) {}

    private static String resolveUrgency(String capUrgency, String event) {
        // CAP urgency: Immediate / Expected / Future / Past / Unknown
        if ("Immediate".equalsIgnoreCase(capUrgency)) return "urgent";
        if ("Expected".equalsIgnoreCase(capUrgency))  return "medium";
        // fallback: keyword check
        String s = event.toLowerCase();
        if (s.contains("颱風") || s.contains("地震") || s.contains("海嘯")) return "urgent";
        if (s.contains("大雨") || s.contains("豪雨") || s.contains("停水") ||
            s.contains("強風") || s.contains("低溫") || s.contains("淹水")) return "medium";
        return "normal";
    }

    private static String buildContent(String desc, String expires, String sender) {
        StringBuilder sb = new StringBuilder(desc);
        if (!expires.isBlank()) {
            sb.append("\n\n到期時間：").append(formatExpires(expires));
        }
        if (!sender.isBlank()) sb.append("\n來源：").append(sender);
        return sb.toString();
    }

    private static String formatExpires(String iso) {
        try {
            java.time.OffsetDateTime odt = java.time.OffsetDateTime.parse(iso);
            int hour = odt.getHour();
            int minute = odt.getMinute();
            String ampm = hour < 12 ? "上午" : "下午";
            int h12 = hour % 12 == 0 ? 12 : hour % 12;
            String time = minute == 0
                    ? ampm + h12 + "點"
                    : String.format("%s%d:%02d", ampm, h12, minute);
            return odt.getMonthValue() + "/" + odt.getDayOfMonth() + " " + time;
        } catch (Exception e) {
            return iso;
        }
    }

    private static String text(Element parent, String tag) {
        NodeList nl = parent.getElementsByTagName(tag);
        if (nl.getLength() == 0) return "";
        return nl.item(0).getTextContent().trim();
    }

}
