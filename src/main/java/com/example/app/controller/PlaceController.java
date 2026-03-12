package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.place.CreatePlaceRequest;
import com.example.app.dto.place.PlaceCommentResponse;
import com.example.app.dto.place.PlaceResponse;
import com.example.app.entity.Place;
import com.example.app.service.PlaceQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
@Validated
@Tag(name = "Place", description = "地點/店家 API")
public class PlaceController {

    private final PlaceQueryService placeQueryService;

    @GetMapping
    @Operation(summary = "查詢指定里的地點清單")
    public ApiResponse<PageResult<PlaceResponse>> list(
            @RequestParam @NotNull Long neighborhoodId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(200) int size
    ) {
        PageResult<Place> result = placeQueryService.listByNeighborhood(neighborhoodId, categoryId, categoryName, keyword, sort, page, size);
        List<PlaceResponse> data = result.getRecords().stream().map(PlaceResponse::from).toList();
        return ApiResponse.success(new PageResult<>(result.getTotal(), data));
    }

    @GetMapping("/by-district")
    @Operation(summary = "查詢同區其他里的店家")
    public ApiResponse<PageResult<PlaceResponse>> listByDistrict(
            @RequestParam @NotNull String city,
            @RequestParam @NotNull String district,
            @RequestParam(required = false) Long excludeNeighborhoodId,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(200) int size
    ) {
        PageResult<Place> result = placeQueryService.listByDistrict(city, district, excludeNeighborhoodId, categoryName, keyword, sort, page, size);
        List<PlaceResponse> data = result.getRecords().stream().map(PlaceResponse::from).toList();
        return ApiResponse.success(new PageResult<>(result.getTotal(), data));
    }

    @GetMapping("/all")
    @Operation(summary = "取得指定里的所有地點（不分頁）")
    public ApiResponse<List<PlaceResponse>> listAll(
            @RequestParam @NotNull Long neighborhoodId,
            @RequestParam(required = false) Long categoryId
    ) {
        List<PlaceResponse> data = placeQueryService
                .listAllByNeighborhood(neighborhoodId, categoryId)
                .stream().map(PlaceResponse::from).toList();
        return ApiResponse.success(data);
    }

    @PostMapping
    @Operation(summary = "新增店家（管理員）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PlaceResponse> create(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody @Validated CreatePlaceRequest req
    ) {
        requireAdmin(claims);
        Place place = placeQueryService.createPlace(req);
        return ApiResponse.success(PlaceResponse.from(place));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "編輯店家（管理員）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PlaceResponse> update(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody CreatePlaceRequest req
    ) {
        requireAdmin(claims);
        Place place = placeQueryService.updatePlace(id, req);
        return ApiResponse.success(PlaceResponse.from(place));
    }

    @GetMapping("/{id}")
    @Operation(summary = "依 ID 查詢單筆地點")
    public ApiResponse<PlaceResponse> getById(@PathVariable Long id) {
        Place place = placeQueryService.getById(id);
        if (place == null) throw new BusinessException(ResultCode.NOT_FOUND, "地點不存在");
        return ApiResponse.success(PlaceResponse.from(place));
    }

    @PostMapping("/{id}/like")
    @Operation(summary = "店家按讚/取消按讚", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Map<String, Object>> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        return ApiResponse.success(placeQueryService.toggleLike(id, claims.getUserId()));
    }

    @GetMapping("/{id}/comments")
    @Operation(summary = "查詢店家評論")
    public ApiResponse<PageResult<PlaceCommentResponse>> listComments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size
    ) {
        return ApiResponse.success(placeQueryService.listComments(id, page, size));
    }

    @PostMapping("/{id}/comments")
    @Operation(summary = "新增店家評論（需第三方登入，每人限評一次）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<PlaceCommentResponse> addComment(
            @PathVariable Long id,
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, Object> body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (claims.getRole() == UserRole.GUEST)
            throw new BusinessException(ResultCode.FORBIDDEN, "訪客無法評論，請使用第三方帳號登入");
        String content = (String) body.get("content");
        if (content == null || content.isBlank())
            throw new BusinessException(ResultCode.BAD_REQUEST, "評論內容不得為空");
        Integer rating = body.get("rating") != null ? ((Number) body.get("rating")).intValue() : null;
        if (rating != null && (rating < 1 || rating > 5))
            throw new BusinessException(ResultCode.BAD_REQUEST, "評分範圍 1-5");
        return ApiResponse.success(placeQueryService.addComment(id, claims.getUserId(), content, rating));
    }

    private void requireAdmin(JwtClaims claims) {
        if (claims == null ||
                (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
        }
    }
}
