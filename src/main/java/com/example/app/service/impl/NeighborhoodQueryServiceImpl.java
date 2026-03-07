package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.cache.CacheKeys;
import com.example.app.common.result.PageResult;
import com.example.app.dto.neighborhood.NeighborhoodRecommendResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.NeighborhoodQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NeighborhoodQueryServiceImpl implements NeighborhoodQueryService {

    private static final Duration DETAIL_TTL    = Duration.ofMinutes(30);
    private static final Duration LIST_TTL      = Duration.ofMinutes(20);
    private static final Duration OPTIONS_TTL   = Duration.ofHours(1);
    private static final int      RECOMMEND_TOP = 5;
    private static final double   EARTH_RADIUS_M = 6_371_000.0;

    private final NeighborhoodMapper neighborhoodMapper;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    @Override
    @SuppressWarnings("unchecked")
    public Neighborhood getById(Long id) {
        String key = CacheKeys.neighborhoodDetail(id);
        if (redisTemplate != null) {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof Neighborhood n) {
                return n;
            }
        }
        Neighborhood neighborhood = neighborhoodMapper.selectById(id);
        if (neighborhood != null && redisTemplate != null) {
            redisTemplate.opsForValue().set(key, neighborhood, DETAIL_TTL);
        }
        return neighborhood;
    }

    @Override
    @SuppressWarnings("unchecked")
    public PageResult<Neighborhood> list(String keyword, String city, String district,
                                         int page, int size) {
        String key = CacheKeys.neighborhoodList(city, district, keyword, page, size);
        if (redisTemplate != null) {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof PageResult<?> pr) {
                return (PageResult<Neighborhood>) pr;
            }
        }
        LambdaQueryWrapper<Neighborhood> wrapper = new LambdaQueryWrapper<>();
        wrapper.and(StringUtils.hasText(keyword), w -> w
                    .like(Neighborhood::getName, keyword)
                    .or().like(Neighborhood::getCity, keyword)
                    .or().like(Neighborhood::getDistrict, keyword))
               .eq(StringUtils.hasText(city),     Neighborhood::getCity, city)
               .eq(StringUtils.hasText(district), Neighborhood::getDistrict, district);

        IPage<Neighborhood> result = neighborhoodMapper.selectPage(new Page<>(page, size), wrapper);
        PageResult<Neighborhood> pageResult = new PageResult<>(result.getTotal(), result.getRecords());

        if (redisTemplate != null) {
            redisTemplate.opsForValue().set(key, pageResult, LIST_TTL);
        }
        return pageResult;
    }

    @Override
    public List<NeighborhoodRecommendResponse> recommend(double lat, double lng) {
        List<Neighborhood> candidates = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>()
                        .eq(Neighborhood::getStatus, 1)
                        .isNotNull(Neighborhood::getLat)
                        .isNotNull(Neighborhood::getLng)
        );

        return candidates.stream()
                .map(n -> NeighborhoodRecommendResponse.builder()
                        .id(n.getId())
                        .fullName(n.getFullName())
                        .distanceMeter(haversineMeters(lat, lng,
                                n.getLat().doubleValue(), n.getLng().doubleValue()))
                        .build())
                .sorted(Comparator.comparingInt(NeighborhoodRecommendResponse::getDistanceMeter))
                .limit(RECOMMEND_TOP)
                .toList();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> cities() {
        String key = CacheKeys.neighborhoodCities();
        if (redisTemplate != null) {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof List<?> list) return (List<String>) list;
        }
        List<String> result = neighborhoodMapper.selectDistinctCities();
        if (redisTemplate != null) {
            redisTemplate.opsForValue().set(key, result, OPTIONS_TTL);
        }
        return result;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> districts(String city) {
        String key = CacheKeys.neighborhoodDistricts(city);
        if (redisTemplate != null) {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof List<?> list) return (List<String>) list;
        }
        List<String> result = neighborhoodMapper.selectDistinctDistricts(city);
        if (redisTemplate != null) {
            redisTemplate.opsForValue().set(key, result, OPTIONS_TTL);
        }
        return result;
    }

    // ── Haversine ────────────────────────────────────────────────

    static int haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (int) Math.round(EARTH_RADIUS_M * c);
    }
}
