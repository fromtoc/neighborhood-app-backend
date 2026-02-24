package com.example.app.service;

import com.example.app.common.result.PageResult;
import com.example.app.dto.neighborhood.NeighborhoodRecommendResponse;
import com.example.app.entity.Neighborhood;

import java.util.List;

public interface NeighborhoodQueryService {

    PageResult<Neighborhood> list(String keyword, String city, String district, int page, int size);

    Neighborhood getById(Long id);

    List<NeighborhoodRecommendResponse> recommend(double lat, double lng);
}
