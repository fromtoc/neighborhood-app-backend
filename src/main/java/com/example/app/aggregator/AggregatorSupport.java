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
 * 各 Aggregator 共用工具：載入里地圖、去重、建立 Post 物件。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AggregatorSupport {

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
        Map<String, Long> fullNameMap  = new LinkedHashMap<>();
        Map<String, Long> districtMap  = new LinkedHashMap<>();
        Map<String, List<Long>> cityMap = new LinkedHashMap<>();

        for (Neighborhood nh : all) {
            if (nh.getCity() == null || nh.getDistrict() == null || nh.getName() == null) continue;
            fullNameMap.put(nh.getCity() + nh.getDistrict() + nh.getName(), nh.getId());
            if (nh.getFullName() != null && !nh.getFullName().isBlank())
                fullNameMap.putIfAbsent(nh.getFullName(), nh.getId());
            districtMap.putIfAbsent(nh.getCity() + "@@" + nh.getDistrict(), nh.getId());
            cityMap.computeIfAbsent(nh.getCity(), k -> new ArrayList<>()).add(nh.getId());
        }
        log.info("AggregatorSupport: {} neighborhoods, {} districts, {} cities",
                fullNameMap.size(), districtMap.size(), cityMap.size());
        return new NeighborhoodMaps(fullNameMap, districtMap, cityMap);
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

    public record NeighborhoodMaps(
            Map<String, Long> fullNameMap,
            Map<String, Long> districtMap,
            Map<String, List<Long>> cityMap) {}
}
