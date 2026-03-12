package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.place.CreatePlaceRequest;
import com.example.app.dto.place.PlaceCommentResponse;
import com.example.app.entity.Place;
import com.example.app.entity.PlaceComment;
import com.example.app.entity.PlaceLike;
import com.example.app.entity.User;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.PlaceCommentMapper;
import com.example.app.mapper.PlaceLikeMapper;
import com.example.app.mapper.PlaceMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.service.PlaceQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaceQueryServiceImpl implements PlaceQueryService {

    private final PlaceMapper placeMapper;
    private final PlaceLikeMapper placeLikeMapper;
    private final PlaceCommentMapper placeCommentMapper;
    private final UserMapper userMapper;
    private final NeighborhoodMapper neighborhoodMapper;

    @Override
    public PageResult<Place> listByNeighborhood(Long neighborhoodId, Long categoryId,
                                                String categoryName, String keyword,
                                                String sort, int page, int size) {
        LambdaQueryWrapper<Place> wrapper = buildWrapper(neighborhoodId, categoryId, categoryName, keyword, sort);
        IPage<Place> result = placeMapper.selectPage(new Page<>(page, size), wrapper);
        return new PageResult<>(result.getTotal(), result.getRecords());
    }

    @Override
    public Place getById(Long id) {
        return placeMapper.selectById(id);
    }

    @Override
    public Place createPlace(CreatePlaceRequest req) {
        Place place = new Place();
        place.setNeighborhoodId(req.getNeighborhoodId());
        place.setCategoryId(req.getCategoryId());
        place.setCategoryName(req.getCategoryName());
        place.setName(req.getName());
        place.setDescription(req.getDescription());
        place.setAddress(req.getAddress());
        place.setPhone(req.getPhone());
        place.setWebsite(req.getWebsite());
        place.setHours(req.getHours());
        place.setLat(req.getLat());
        place.setLng(req.getLng());
        place.setCoverImageUrl(req.getCoverImageUrl());
        place.setImagesJson(req.getImages() != null ? toJsonArray(req.getImages()) : null);
        place.setTagsJson(req.getTags() != null ? toJsonArray(req.getTags()) : null);
        place.setRating(BigDecimal.ZERO);
        place.setReviewCount(0);
        place.setLikeCount(0);
        place.setHasHomeService(Boolean.TRUE.equals(req.getHasHomeService()) ? 1 : 0);
        place.setIsPartner(Boolean.TRUE.equals(req.getIsPartner()) ? 1 : 0);
        place.setStatus(1);
        placeMapper.insert(place);
        return place;
    }

    @Override
    public Place updatePlace(Long id, CreatePlaceRequest req) {
        Place place = placeMapper.selectById(id);
        if (place == null) throw new BusinessException(ResultCode.NOT_FOUND, "地點不存在");
        if (req.getNeighborhoodId() != null) place.setNeighborhoodId(req.getNeighborhoodId());
        if (req.getCategoryId() != null) place.setCategoryId(req.getCategoryId());
        if (req.getCategoryName() != null) place.setCategoryName(req.getCategoryName());
        if (req.getName() != null) place.setName(req.getName());
        if (req.getDescription() != null) place.setDescription(req.getDescription());
        if (req.getAddress() != null) place.setAddress(req.getAddress());
        if (req.getPhone() != null) place.setPhone(req.getPhone());
        if (req.getWebsite() != null) place.setWebsite(req.getWebsite());
        if (req.getHours() != null) place.setHours(req.getHours());
        if (req.getLat() != null) place.setLat(req.getLat());
        if (req.getLng() != null) place.setLng(req.getLng());
        if (req.getCoverImageUrl() != null) place.setCoverImageUrl(req.getCoverImageUrl());
        if (req.getImages() != null) place.setImagesJson(toJsonArray(req.getImages()));
        if (req.getTags() != null) place.setTagsJson(toJsonArray(req.getTags()));
        if (req.getHasHomeService() != null) place.setHasHomeService(req.getHasHomeService() ? 1 : 0);
        if (req.getIsPartner() != null) place.setIsPartner(req.getIsPartner() ? 1 : 0);
        placeMapper.updateById(place);
        return place;
    }

    private static String toJsonArray(List<String> list) {
        if (list == null || list.isEmpty()) return "[]";
        return "[" + list.stream().map(s -> "\"" + s.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",")) + "]";
    }

    @Override
    public List<Place> listAllByNeighborhood(Long neighborhoodId, Long categoryId) {
        return placeMapper.selectList(buildWrapper(neighborhoodId, categoryId, null, null, null));
    }

    @Override
    public PageResult<Place> listByDistrict(String city, String district, Long excludeNeighborhoodId,
                                            String categoryName, String keyword, String sort, int page, int size) {
        // 找出同區所有里的 ID（排除當前里）
        List<Long> nhIds = neighborhoodMapper.selectList(
                new LambdaQueryWrapper<Neighborhood>()
                        .eq(Neighborhood::getCity, city)
                        .eq(Neighborhood::getDistrict, district)
                        .eq(Neighborhood::getStatus, 1)
                        .ne(excludeNeighborhoodId != null, Neighborhood::getId, excludeNeighborhoodId)
                        .select(Neighborhood::getId))
                .stream().map(Neighborhood::getId).toList();

        if (nhIds.isEmpty()) return new PageResult<>(0L, List.of());

        LambdaQueryWrapper<Place> wrapper = new LambdaQueryWrapper<Place>()
                .in(Place::getNeighborhoodId, nhIds)
                .eq(Place::getStatus, 1)
                .eq(StringUtils.hasText(categoryName), Place::getCategoryName, categoryName)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(Place::getName, keyword)
                        .or()
                        .like(Place::getAddress, keyword));
        if ("rating".equals(sort)) wrapper.orderByDesc(Place::getRating);
        else if ("oldest".equals(sort)) wrapper.orderByAsc(Place::getCreatedAt);
        else wrapper.orderByDesc(Place::getCreatedAt);

        IPage<Place> result = placeMapper.selectPage(new Page<>(page, size), wrapper);
        return new PageResult<>(result.getTotal(), result.getRecords());
    }

    @Override
    @Transactional
    public Map<String, Object> toggleLike(Long placeId, Long userId) {
        PlaceLike existing = placeLikeMapper.selectOne(
                new LambdaQueryWrapper<PlaceLike>()
                        .eq(PlaceLike::getPlaceId, placeId)
                        .eq(PlaceLike::getUserId, userId));

        boolean liked;
        if (existing != null) {
            placeLikeMapper.deleteById(existing.getId());
            placeMapper.update(new LambdaUpdateWrapper<Place>()
                    .eq(Place::getId, placeId)
                    .setSql("like_count = GREATEST(like_count - 1, 0)"));
            liked = false;
        } else {
            PlaceLike pl = new PlaceLike();
            pl.setPlaceId(placeId);
            pl.setUserId(userId);
            placeLikeMapper.insert(pl);
            placeMapper.update(new LambdaUpdateWrapper<Place>()
                    .eq(Place::getId, placeId)
                    .setSql("like_count = like_count + 1"));
            liked = true;
        }

        Place place = placeMapper.selectById(placeId);
        return Map.of("liked", liked, "likeCount", place.getLikeCount());
    }

    @Override
    @Transactional
    public PlaceCommentResponse addComment(Long placeId, Long userId, String content, Integer rating) {
        // 檢查是否已評論過此店家
        Long existing = placeCommentMapper.selectCount(
                new LambdaQueryWrapper<PlaceComment>()
                        .eq(PlaceComment::getPlaceId, placeId)
                        .eq(PlaceComment::getUserId, userId));
        if (existing > 0) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "您已評論過此店家");
        }

        PlaceComment comment = new PlaceComment();
        comment.setPlaceId(placeId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setRating(rating);
        comment.setLikeCount(0);
        placeCommentMapper.insert(comment);

        // 更新 place 的 review_count 和 rating
        updatePlaceRating(placeId);

        User user = userMapper.selectById(userId);
        String authorName = buildName(user);
        return PlaceCommentResponse.from(comment, authorName);
    }

    @Override
    public PageResult<PlaceCommentResponse> listComments(Long placeId, int page, int size) {
        LambdaQueryWrapper<PlaceComment> wrapper = new LambdaQueryWrapper<PlaceComment>()
                .eq(PlaceComment::getPlaceId, placeId)
                .orderByDesc(PlaceComment::getCreatedAt);
        IPage<PlaceComment> result = placeCommentMapper.selectPage(new Page<>(page, size), wrapper);
        List<PlaceComment> comments = result.getRecords();

        // batch load users
        Map<Long, User> userMap = Map.of();
        if (!comments.isEmpty()) {
            List<Long> userIds = comments.stream().map(PlaceComment::getUserId).distinct().toList();
            userMap = userMapper.selectBatchIds(userIds).stream()
                    .collect(Collectors.toMap(User::getId, u -> u));
        }

        Map<Long, User> finalUserMap = userMap;
        List<PlaceCommentResponse> responses = comments.stream()
                .map(c -> PlaceCommentResponse.from(c, buildName(finalUserMap.get(c.getUserId()))))
                .toList();
        return new PageResult<>(result.getTotal(), responses);
    }

    private void updatePlaceRating(Long placeId) {
        Long count = placeCommentMapper.selectCount(
                new LambdaQueryWrapper<PlaceComment>()
                        .eq(PlaceComment::getPlaceId, placeId)
                        .isNotNull(PlaceComment::getRating));

        // 計算有評分的評論的平均值
        List<PlaceComment> rated = placeCommentMapper.selectList(
                new LambdaQueryWrapper<PlaceComment>()
                        .eq(PlaceComment::getPlaceId, placeId)
                        .isNotNull(PlaceComment::getRating)
                        .select(PlaceComment::getRating));

        BigDecimal avg = BigDecimal.ZERO;
        if (!rated.isEmpty()) {
            int sum = rated.stream().mapToInt(PlaceComment::getRating).sum();
            avg = BigDecimal.valueOf(sum).divide(BigDecimal.valueOf(rated.size()), 1, RoundingMode.HALF_UP);
        }

        Long totalComments = placeCommentMapper.selectCount(
                new LambdaQueryWrapper<PlaceComment>()
                        .eq(PlaceComment::getPlaceId, placeId));

        placeMapper.update(new LambdaUpdateWrapper<Place>()
                .eq(Place::getId, placeId)
                .set(Place::getRating, avg)
                .set(Place::getReviewCount, totalComments.intValue()));
    }

    private static String buildName(User u) {
        if (u == null) return null;
        if (u.getNickname() != null) return u.getNickname();
        if (Integer.valueOf(1).equals(u.getIsGuest())) return "訪客 #" + u.getId();
        return "用戶 #" + u.getId();
    }

    private LambdaQueryWrapper<Place> buildWrapper(Long neighborhoodId, Long categoryId,
                                                     String categoryName, String keyword, String sort) {
        LambdaQueryWrapper<Place> wrapper = new LambdaQueryWrapper<Place>()
                .eq(Place::getNeighborhoodId, neighborhoodId)
                .eq(Place::getStatus, 1)
                .eq(categoryId != null, Place::getCategoryId, categoryId)
                .eq(StringUtils.hasText(categoryName), Place::getCategoryName, categoryName)
                .and(StringUtils.hasText(keyword), w -> w
                        .like(Place::getName, keyword)
                        .or()
                        .like(Place::getAddress, keyword));

        if ("rating".equals(sort)) {
            wrapper.orderByDesc(Place::getRating);
        } else if ("oldest".equals(sort)) {
            wrapper.orderByAsc(Place::getCreatedAt);
        } else {
            wrapper.orderByDesc(Place::getCreatedAt);
        }
        return wrapper;
    }
}
