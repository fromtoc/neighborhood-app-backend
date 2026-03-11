package com.example.app.aggregator;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.CrawlLog;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Post;
import com.example.app.entity.User;
import com.example.app.mapper.CrawlLogMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 各 Aggregator 共用工具：載入里地圖、去重、建立 Post 物件、地理比對。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AggregatorSupport {

    /** 縣市正規名（臺開頭）→ 別名（台開頭），供 resolveTargets 使用 */
    public static final String[][] COUNTY_ALIASES = {
        {"臺北市","台北市"}, {"新北市","新北市"}, {"桃園市","桃園市"},
        {"臺中市","台中市"}, {"臺南市","台南市"}, {"高雄市","高雄市"},
        {"基隆市","基隆市"}, {"新竹市","新竹市"}, {"嘉義市","嘉義市"},
        {"新竹縣","新竹縣"}, {"苗栗縣","苗栗縣"}, {"彰化縣","彰化縣"},
        {"南投縣","南投縣"}, {"雲林縣","雲林縣"}, {"嘉義縣","嘉義縣"},
        {"屏東縣","屏東縣"}, {"宜蘭縣","宜蘭縣"}, {"花蓮縣","花蓮縣"},
        {"臺東縣","台東縣"}, {"澎湖縣","澎湖縣"}, {"金門縣","金門縣"},
        {"連江縣","連江縣"},
    };

    private final CrawlLogMapper     crawlLogMapper;
    private final UserMapper         userMapper;
    private final NeighborhoodMapper neighborhoodMapper;

    public Long loadSystemUserId() {
        User sys = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getIsSystem, 1).last("LIMIT 1"));
        return sys != null ? sys.getId() : null;
    }

    /** 載入所有 status=1 里的名稱對應表 */
    public NeighborhoodMaps loadMaps() {
        List<Neighborhood> all = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>().eq(Neighborhood::getStatus, 1));
        Map<String, Long>         fullNameMap       = new LinkedHashMap<>();
        Map<String, Long>         districtMap       = new LinkedHashMap<>();
        Map<String, List<Long>>   cityMap           = new LinkedHashMap<>();
        // 里名 → NhInfo 列表（同名里可能在不同縣市/區）
        Map<String, List<NhInfo>> liNameMap         = new LinkedHashMap<>();
        // 區名（含「區/鄉/鎮/市」）→ NhInfo 列表
        Map<String, List<NhInfo>> districtNameMap   = new LinkedHashMap<>();

        for (Neighborhood nh : all) {
            if (nh.getCity() == null || nh.getDistrict() == null || nh.getName() == null) continue;
            fullNameMap.put(nh.getCity() + nh.getDistrict() + nh.getName(), nh.getId());
            if (nh.getFullName() != null && !nh.getFullName().isBlank())
                fullNameMap.putIfAbsent(nh.getFullName(), nh.getId());
            districtMap.putIfAbsent(nh.getCity() + "@@" + nh.getDistrict(), nh.getId());
            cityMap.computeIfAbsent(nh.getCity(), k -> new ArrayList<>()).add(nh.getId());

            NhInfo info = new NhInfo(nh.getCity(), nh.getDistrict(), nh.getId());
            // 里名反查（同名里可能在不同縣市/區，全部收錄）
            liNameMap.computeIfAbsent(nh.getName(), k -> new ArrayList<>()).add(info);
            // 區名反查：同一縣市+區只保留一筆代表里
            String districtKey = nh.getCity() + "@@" + nh.getDistrict();
            List<NhInfo> distList = districtNameMap.computeIfAbsent(nh.getDistrict(), k -> new ArrayList<>());
            boolean alreadyHasDistrict = distList.stream()
                    .anyMatch(x -> x.city().equals(nh.getCity()) && x.district().equals(nh.getDistrict()));
            if (!alreadyHasDistrict) distList.add(info);
        }
        log.info("AggregatorSupport: {} neighborhoods, {} districts, {} cities, {} liNames",
                fullNameMap.size(), districtMap.size(), cityMap.size(), liNameMap.size());
        return new NeighborhoodMaps(fullNameMap, districtMap, cityMap, liNameMap, districtNameMap);
    }

    public boolean isAlreadyCrawled(String source, String key) {
        return crawlLogMapper.selectCount(
                new LambdaQueryWrapper<CrawlLog>()
                        .eq(CrawlLog::getSource, source)
                        .eq(CrawlLog::getEntryKey, key)) > 0;
    }

    public void markCrawled(String source, String key) {
        CrawlLog c = new CrawlLog();
        c.setSource(source);
        c.setEntryKey(key);
        c.setCreatedAt(LocalDateTime.now());
        try { crawlLogMapper.insert(c); } catch (Exception ignored) {}
    }

    public Post buildPost(Long nhId, Long systemUserId,
                          String type, String title, String content, String urgency) {
        Post p = new Post();
        p.setNeighborhoodId(nhId);
        p.setUserId(systemUserId);
        p.setTitle(title);
        p.setContent(content);
        p.setType(type);
        p.setUrgency(urgency != null ? urgency : "normal");
        p.setLikeCount(0);
        p.setCommentCount(0);
        p.setStatus(1);
        return p;
    }

    public static String sha256(String input) {
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

    /**
     * 嚴格優先度比對：里 > 區 > 縣市。
     * 適用於含有自由文字的爬蟲資料（RSS 新聞、氣象特報描述等）。
     */
    public Set<Long> resolveTargets(String text, NeighborhoodMaps maps) {
        // Step 0: 抽出文中縣市（正規化為「臺」開頭）
        Set<String> mentionedCities = new LinkedHashSet<>();
        for (String[] aliases : COUNTY_ALIASES) {
            for (String alias : aliases) {
                if (text.contains(alias)) { mentionedCities.add(aliases[0]); break; }
            }
        }

        // Step 1: 里名比對（需城市 context 避免同名里誤判）
        Set<Long> liMatches = new LinkedHashSet<>();
        for (Map.Entry<String, List<NhInfo>> e : maps.liNameMap().entrySet()) {
            String liName = e.getKey();
            if (liName.length() < 2 || !text.contains(liName)) continue;
            for (NhInfo info : e.getValue()) {
                boolean cityOk = mentionedCities.isEmpty()
                        || mentionedCities.contains(info.city())
                        || mentionedCities.contains(info.city().replace("臺", "台"));
                if (!cityOk) continue;
                if (mentionedCities.isEmpty() && e.getValue().size() > 1) continue;
                liMatches.add(info.nhId());
            }
        }
        if (!liMatches.isEmpty()) return liMatches;

        // Step 2: 區名比對（以縣市 context 過濾同名區）
        Set<Long> districtMatches = new LinkedHashSet<>();
        for (Map.Entry<String, List<NhInfo>> e : maps.districtNameMap().entrySet()) {
            String distName = e.getKey();
            if (distName.length() < 2 || !text.contains(distName)) continue;
            for (NhInfo info : e.getValue()) {
                boolean cityOk = mentionedCities.isEmpty()
                        || mentionedCities.contains(info.city())
                        || mentionedCities.contains(info.city().replace("臺", "台"));
                if (!cityOk) continue;
                if (e.getValue().size() > 1 && mentionedCities.isEmpty()) continue;
                Long repNhId = maps.districtMap().get(info.city() + "@@" + info.district());
                if (repNhId != null) districtMatches.add(repNhId);
            }
        }
        if (!districtMatches.isEmpty()) return districtMatches;

        // Step 3: 縣市層級 → 該縣市所有區各一筆
        return resolveAllByCity(mentionedCities, maps);
    }

    /**
     * 給定縣市名稱（台/臺皆可），回傳該縣市所有行政區的代表里 nhId 集合。
     */
    public Set<Long> resolveAllByCity(String city, NeighborhoodMaps maps) {
        Set<String> cities = new LinkedHashSet<>();
        cities.add(city.replace("台", "臺"));
        cities.add(city);
        return resolveAllByCity(cities, maps);
    }

    private Set<Long> resolveAllByCity(Set<String> cities, NeighborhoodMaps maps) {
        Set<Long> result = new LinkedHashSet<>();
        for (Map.Entry<String, Long> e : maps.districtMap().entrySet()) {
            String[] parts = e.getKey().split("@@");
            if (cities.contains(parts[0])) result.add(e.getValue());
        }
        return result;
    }

    /** 里/區/縣市的定位資訊 */
    public record NhInfo(String city, String district, Long nhId) {}

    public record NeighborhoodMaps(
            Map<String, Long>         fullNameMap,
            Map<String, Long>         districtMap,
            Map<String, List<Long>>   cityMap,
            Map<String, List<NhInfo>> liNameMap,
            Map<String, List<NhInfo>> districtNameMap) {}
}
