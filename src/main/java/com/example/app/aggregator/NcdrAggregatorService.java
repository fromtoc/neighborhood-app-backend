package com.example.app.aggregator;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.CrawlLog;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Post;
import com.example.app.entity.User;
import com.example.app.mapper.CrawlLogMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.PostMapper;
import com.example.app.mapper.UserMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
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
    private final CrawlLogMapper     crawlLogMapper;
    private final PostMapper         postMapper;
    private final UserMapper         userMapper;
    private final NeighborhoodMapper neighborhoodMapper;

    private Long systemUserId;

    /** fullName (city+district+liName) → neighborhoodId */
    private Map<String, Long> fullNameMap = new HashMap<>();
    /** city+district → representative neighborhoodId（fallback 用） */
    private Map<String, Long> districtMap = new HashMap<>();

    @PostConstruct
    public void init() {
        User sys = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getIsSystem, 1).last("LIMIT 1"));
        if (sys != null) systemUserId = sys.getId();
        reloadMaps();
    }

    private void reloadMaps() {
        List<Neighborhood> all = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>().eq(Neighborhood::getStatus, 1));
        Map<String, Long> fn = new LinkedHashMap<>();
        Map<String, Long> dm = new LinkedHashMap<>();
        for (Neighborhood nh : all) {
            if (nh.getCity() == null || nh.getDistrict() == null || nh.getName() == null) continue;
            fn.put(nh.getCity() + nh.getDistrict() + nh.getName(), nh.getId());
            dm.putIfAbsent(nh.getCity() + "@@" + nh.getDistrict(), nh.getId());
        }
        fullNameMap = fn;
        districtMap = dm;
        log.info("NCDR: loaded {} neighborhoods, {} districts", fn.size(), dm.size());
    }

    @Scheduled(fixedDelayString = "${aggregator.ncdr.interval-ms:1800000}",
               initialDelayString = "${aggregator.ncdr.initial-delay-ms:15000}")
    public void crawl() {
        if (systemUserId == null) {
            User sys = userMapper.selectOne(
                    new LambdaQueryWrapper<User>().eq(User::getIsSystem, 1).last("LIMIT 1"));
            if (sys == null) { log.warn("NCDR: system user not found, skip"); return; }
            systemUserId = sys.getId();
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
        String xml;
        try {
            xml = restTemplate.getForObject(capUrl, String.class);
            if (xml == null || xml.isBlank()) return 0;
        } catch (Exception e) {
            log.debug("NCDR: failed to fetch CAP {}", capUrl, e);
            return 0;
        }

        Document doc;
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            doc = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            log.debug("NCDR: failed to parse CAP XML for {}", capId, e);
            return 0;
        }

        NodeList infoList = doc.getElementsByTagName("info");
        int created = 0;

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
            String key = sha256(capId + "@@" + i + "@@" + description);
            if (isAlreadyCrawled(key)) continue;

            // 解析所有 <area> 元素，比對里名稱
            NodeList areaList = info.getElementsByTagName("area");
            List<MatchedArea> matched = new ArrayList<>();

            for (int j = 0; j < areaList.getLength(); j++) {
                Element area    = (Element) areaList.item(j);
                String areaDesc = text(area, "areaDesc"); // e.g. "高雄市左營區新中里"

                Long nhId = fullNameMap.get(areaDesc);
                if (nhId != null) {
                    matched.add(new MatchedArea(nhId, "li_info"));
                    continue;
                }
                // 嘗試比對 city+district（截取前兩段）
                for (Map.Entry<String, Long> de : districtMap.entrySet()) {
                    String[] parts   = de.getKey().split("@@");
                    String cityDistrict = parts[0] + parts[1]; // e.g. "高雄市左營區"
                    if (areaDesc.startsWith(cityDistrict)) {
                        matched.add(new MatchedArea(de.getValue(), "district_info"));
                        break;
                    }
                }
            }

            if (matched.isEmpty()) {
                markCrawled(key);
                continue;
            }

            // 去重：同一個 nhId+type 只建一篇
            Set<String> seen = new LinkedHashSet<>();
            for (MatchedArea m : matched) {
                String dedup = m.nhId + ":" + m.type;
                if (!seen.add(dedup)) continue;

                Post post = new Post();
                post.setNeighborhoodId(m.nhId);
                post.setUserId(systemUserId);
                post.setTitle(headline.isBlank() ? event : headline);
                post.setContent(buildContent(description, expires, senderName));
                post.setType(m.type);
                post.setUrgency(resolveUrgency(urgency, event));
                post.setLikeCount(0);
                post.setCommentCount(0);
                post.setStatus(1);
                postMapper.insert(post);
                created++;
            }

            markCrawled(key);
        }

        return created;
    }

    private record MatchedArea(Long nhId, String type) {}

    private boolean isAlreadyCrawled(String key) {
        return crawlLogMapper.selectCount(
                new LambdaQueryWrapper<CrawlLog>()
                        .eq(CrawlLog::getSource, SOURCE)
                        .eq(CrawlLog::getEntryKey, key)) > 0;
    }

    private void markCrawled(String key) {
        CrawlLog log = new CrawlLog();
        log.setSource(SOURCE);
        log.setEntryKey(key);
        log.setCreatedAt(LocalDateTime.now());
        try { crawlLogMapper.insert(log); } catch (Exception ignored) {}
    }

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
        if (!expires.isBlank())  sb.append("\n\n到期時間：").append(expires);
        if (!sender.isBlank())   sb.append("\n來源：").append(sender);
        return sb.toString();
    }

    private static String text(Element parent, String tag) {
        NodeList nl = parent.getElementsByTagName(tag);
        if (nl.getLength() == 0) return "";
        return nl.item(0).getTextContent().trim();
    }

    private static String sha256(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
