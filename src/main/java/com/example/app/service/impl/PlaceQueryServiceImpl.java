package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.result.PageResult;
import com.example.app.entity.Place;
import com.example.app.mapper.PlaceMapper;
import com.example.app.service.PlaceQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlaceQueryServiceImpl implements PlaceQueryService {

    private final PlaceMapper placeMapper;

    @Override
    public PageResult<Place> listByNeighborhood(Long neighborhoodId, Long categoryId,
                                                String keyword, int page, int size) {
        LambdaQueryWrapper<Place> wrapper = buildWrapper(neighborhoodId, categoryId, keyword);
        IPage<Place> result = placeMapper.selectPage(new Page<>(page, size), wrapper);
        return new PageResult<>(result.getTotal(), result.getRecords());
    }

    @Override
    public Place getById(Long id) {
        return placeMapper.selectById(id);
    }

    @Override
    public List<Place> listAllByNeighborhood(Long neighborhoodId, Long categoryId) {
        return placeMapper.selectList(buildWrapper(neighborhoodId, categoryId, null));
    }

    private LambdaQueryWrapper<Place> buildWrapper(Long neighborhoodId, Long categoryId, String keyword) {
        return new LambdaQueryWrapper<Place>()
                .eq(Place::getNeighborhoodId, neighborhoodId)
                .eq(Place::getStatus, 1)
                .eq(categoryId != null, Place::getCategoryId, categoryId)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(Place::getName, keyword)
                        .or()
                        .like(Place::getAddress, keyword))
                .orderByDesc(Place::getCreatedAt);
    }
}
