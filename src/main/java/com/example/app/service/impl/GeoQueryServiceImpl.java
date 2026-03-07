package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.GeoQueryService;
import com.example.app.service.NeighborhoodQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GeoQueryServiceImpl implements GeoQueryService {

    private final NeighborhoodQueryService neighborhoodQueryService;
    private final NeighborhoodMapper neighborhoodMapper;

    @Override
    public List<String> getCities() {
        // 重用 NeighborhoodQueryService（含 Redis 快取）
        return neighborhoodQueryService.cities();
    }

    @Override
    public List<String> getDistricts(String city) {
        return neighborhoodQueryService.districts(city);
    }

    @Override
    public List<Neighborhood> listLisByDistrict(String city, String district) {
        return neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>()
                        .eq(Neighborhood::getStatus, 1)
                        .eq(StringUtils.hasText(city),     Neighborhood::getCity,     city)
                        .eq(StringUtils.hasText(district), Neighborhood::getDistrict, district)
                        .orderByAsc(Neighborhood::getName)
        );
    }

    @Override
    public Neighborhood getLi(String city, String district, String liName) {
        return neighborhoodMapper.selectOne(
                new LambdaQueryWrapper<Neighborhood>()
                        .eq(Neighborhood::getStatus, 1)
                        .eq(StringUtils.hasText(city),     Neighborhood::getCity,     city)
                        .eq(StringUtils.hasText(district), Neighborhood::getDistrict, district)
                        .eq(StringUtils.hasText(liName),   Neighborhood::getName,     liName)
                        .last("LIMIT 1")
        );
    }

    @Override
    public Neighborhood getLiById(Long id) {
        return neighborhoodMapper.selectById(id);
    }
}
