package com.example.app.service;

import com.example.app.common.result.PageResult;
import com.example.app.dto.place.PlaceCommentResponse;
import com.example.app.entity.Place;

import com.example.app.dto.place.CreatePlaceRequest;

import java.util.List;
import java.util.Map;

public interface PlaceQueryService {

    PageResult<Place> listByNeighborhood(Long neighborhoodId, Long categoryId,
                                         String categoryName, String keyword,
                                         String sort, int page, int size);

    Place getById(Long id);

    /** 新增店家（管理員） */
    Place createPlace(CreatePlaceRequest req);

    /** 編輯店家（管理員） */
    Place updatePlace(Long id, CreatePlaceRequest req);

    List<Place> listAllByNeighborhood(Long neighborhoodId, Long categoryId);

    /** 查詢同區其他里的店家（排除指定里） */
    PageResult<Place> listByDistrict(String city, String district, Long excludeNeighborhoodId,
                                     String categoryName, String keyword, String sort, int page, int size);

    /** Toggle like, return {liked, likeCount} */
    Map<String, Object> toggleLike(Long placeId, Long userId);

    /** 新增評論 */
    PlaceCommentResponse addComment(Long placeId, Long userId, String content, Integer rating);

    /** 查詢評論列表 */
    PageResult<PlaceCommentResponse> listComments(Long placeId, int page, int size);
}
