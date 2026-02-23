package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.cache.CacheKeys;
import com.example.app.common.result.PageResult;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.NeighborhoodQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class NeighborhoodQueryServiceImpl implements NeighborhoodQueryService {

    private static final Duration DETAIL_TTL = Duration.ofMinutes(30);
    private static final Duration LIST_TTL   = Duration.ofMinutes(20);

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
        wrapper.like(StringUtils.hasText(keyword), Neighborhood::getName, keyword)
               .eq(StringUtils.hasText(city),     Neighborhood::getCity, city)
               .eq(StringUtils.hasText(district), Neighborhood::getDistrict, district);

        IPage<Neighborhood> result = neighborhoodMapper.selectPage(new Page<>(page, size), wrapper);
        PageResult<Neighborhood> pageResult = new PageResult<>(result.getTotal(), result.getRecords());

        if (redisTemplate != null) {
            redisTemplate.opsForValue().set(key, pageResult, LIST_TTL);
        }
        return pageResult;
    }
}
