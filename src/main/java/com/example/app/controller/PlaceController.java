package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.place.PlaceResponse;
import com.example.app.entity.Place;
import com.example.app.service.PlaceQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
@Validated
@Tag(name = "Place", description = "地點/店家 API")
public class PlaceController {

    private final PlaceQueryService placeQueryService;

    @GetMapping
    @Operation(
            summary = "查詢指定里的地點清單",
            description = "支援分類篩選與關鍵字搜尋，結果分頁"
    )
    public ApiResponse<PageResult<PlaceResponse>> list(
            @Parameter(description = "里 ID", required = true, in = ParameterIn.QUERY)
            @RequestParam @NotNull Long neighborhoodId,

            @Parameter(description = "分類 ID（不傳 = 全部）", in = ParameterIn.QUERY)
            @RequestParam(required = false) Long categoryId,

            @Parameter(description = "關鍵字（名稱/地址模糊查詢）", in = ParameterIn.QUERY)
            @RequestParam(required = false) String keyword,

            @Parameter(description = "頁碼（從 1 開始）", in = ParameterIn.QUERY)
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "每頁筆數（最大 50）", in = ParameterIn.QUERY)
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size
    ) {
        PageResult<Place> result = placeQueryService.listByNeighborhood(neighborhoodId, categoryId, keyword, page, size);
        List<PlaceResponse> data = result.getRecords().stream().map(PlaceResponse::from).toList();
        return ApiResponse.success(new PageResult<>(result.getTotal(), data));
    }

    @GetMapping("/all")
    @Operation(
            summary = "取得指定里的所有地點（不分頁）",
            description = "供地圖顯示用，建議搭配 categoryId 篩選"
    )
    public ApiResponse<List<PlaceResponse>> listAll(
            @Parameter(description = "里 ID", required = true, in = ParameterIn.QUERY)
            @RequestParam @NotNull Long neighborhoodId,

            @Parameter(description = "分類 ID（不傳 = 全部）", in = ParameterIn.QUERY)
            @RequestParam(required = false) Long categoryId
    ) {
        List<PlaceResponse> data = placeQueryService
                .listAllByNeighborhood(neighborhoodId, categoryId)
                .stream().map(PlaceResponse::from).toList();
        return ApiResponse.success(data);
    }

    @GetMapping("/{id}")
    @Operation(summary = "依 ID 查詢單筆地點")
    public ApiResponse<PlaceResponse> getById(
            @Parameter(description = "地點 ID", required = true)
            @PathVariable Long id
    ) {
        Place place = placeQueryService.getById(id);
        if (place == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "地點不存在");
        }
        return ApiResponse.success(PlaceResponse.from(place));
    }
}
