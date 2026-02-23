package com.example.app.service;

import com.example.app.common.result.PageResult;
import com.example.app.entity.Neighborhood;

public interface NeighborhoodQueryService {

    PageResult<Neighborhood> list(String keyword, String city, String district, int page, int size);

    Neighborhood getById(Long id);
}
