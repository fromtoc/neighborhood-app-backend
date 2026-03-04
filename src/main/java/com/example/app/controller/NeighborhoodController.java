package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.neighborhood.IntersectResponse;
import com.example.app.dto.neighborhood.LocateResponse;
import com.example.app.dto.neighborhood.NeighborhoodRecommendResponse;
import com.example.app.dto.neighborhood.NeighborhoodResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.service.NeighborhoodQueryService;
import com.example.app.service.NeighborhoodSpatialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/neighborhoods")
@RequiredArgsConstructor
@Validated
@Tag(name = "Neighborhood", description = "鄰里查詢 API")
public class NeighborhoodController {

    private final NeighborhoodQueryService   neighborhoodQueryService;
    private final NeighborhoodSpatialService neighborhoodSpatialService;

    @GetMapping
    @Operation(
            summary = "查詢鄰里清單",
            description = "支援關鍵字、縣市、行政區篩選，結果分頁；含 Redis 快取（TTL 20 分鐘）"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "查詢成功",
                    content = @Content(schema = @Schema(implementation = NeighborhoodResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422",
                    description = "參數驗證失敗")
    })
    public ApiResponse<PageResult<NeighborhoodResponse>> list(
            @Parameter(description = "關鍵字（里名稱模糊查詢）", in = ParameterIn.QUERY)
            @RequestParam(required = false) String keyword,

            @Parameter(description = "縣市（完整比對）", in = ParameterIn.QUERY)
            @RequestParam(required = false) String cityCode,

            @Parameter(description = "行政區（完整比對）", in = ParameterIn.QUERY)
            @RequestParam(required = false) String districtCode,

            @Parameter(description = "頁碼，從 1 開始", in = ParameterIn.QUERY, schema = @Schema(defaultValue = "1"))
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "每頁筆數，最大 100", in = ParameterIn.QUERY, schema = @Schema(defaultValue = "20"))
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        PageResult<Neighborhood> result =
                neighborhoodQueryService.list(keyword, cityCode, districtCode, page, size);
        return ApiResponse.success(NeighborhoodResponse.fromPage(result));
    }

    @GetMapping("/cities")
    @Operation(
            summary = "取得縣市清單",
            description = "回傳所有有效鄰里涵蓋的縣市，供篩選下拉選單使用（Redis 快取 1 小時）"
    )
    public ApiResponse<List<String>> cities() {
        return ApiResponse.success(neighborhoodQueryService.cities());
    }

    @GetMapping("/districts")
    @Operation(
            summary = "取得行政區清單",
            description = "回傳指定縣市下的所有行政區，供篩選下拉選單使用（Redis 快取 1 小時）"
    )
    public ApiResponse<List<String>> districts(
            @Parameter(description = "縣市名稱，例如「桃園市」", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String city
    ) {
        return ApiResponse.success(neighborhoodQueryService.districts(city));
    }

    @GetMapping("/recommend")
    @Operation(
            summary = "依座標推薦最近鄰里",
            description = "回傳距離最近的 5 筆（status=1 且已設定座標），依距離升冪排列"
    )
    public ApiResponse<List<NeighborhoodRecommendResponse>> recommend(
            @Parameter(description = "緯度 [-90, 90]", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,

            @Parameter(description = "經度 [-180, 180]", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng
    ) {
        return ApiResponse.success(neighborhoodQueryService.recommend(lat, lng));
    }

    @GetMapping("/locate")
    @Operation(
            summary = "依座標或地址定位所在里",
            description = "傳入 lat/lng（GPS）或 address（地址，需設定 TGOS_API_KEY）。lat/lng 優先。"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "定位成功，或 code=400/404/503"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422",
                    description = "參數格式錯誤")
    })
    public ApiResponse<LocateResponse> locate(
            @Parameter(description = "緯度 [-90, 90]", in = ParameterIn.QUERY)
            @RequestParam(required = false)
            @DecimalMin("-90") @DecimalMax("90") Double lat,

            @Parameter(description = "經度 [-180, 180]", in = ParameterIn.QUERY)
            @RequestParam(required = false)
            @DecimalMin("-180") @DecimalMax("180") Double lng,

            @Parameter(description = "地址（需設定 TGOS_API_KEY）", in = ParameterIn.QUERY)
            @RequestParam(required = false)
            @Size(max = 200) String address
    ) {
        return ApiResponse.success(neighborhoodSpatialService.locate(lat, lng, address));
    }

    @GetMapping("/nearby")
    @Operation(
            summary = "依座標與半徑查詢附近鄰里",
            description = "找出多邊形邊界與指定圓形範圍有任何交疊的里，依中心距升冪排序"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "查詢成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422",
                    description = "參數驗證失敗（radius 超出範圍）")
    })
    public ApiResponse<List<IntersectResponse>> nearby(
            @Parameter(description = "緯度 [-90, 90]", required = true, in = ParameterIn.QUERY)
            @RequestParam @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,

            @Parameter(description = "經度 [-180, 180]", required = true, in = ParameterIn.QUERY)
            @RequestParam @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng,

            @Parameter(description = "半徑（公尺，1–50000）", required = true, in = ParameterIn.QUERY)
            @RequestParam @NotNull @Min(1) @Max(50000) Integer radius
    ) {
        return ApiResponse.success(neighborhoodSpatialService.nearby(lat, lng, radius));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "依 ID 查詢鄰里",
            description = "含 Redis 快取（TTL 30 分鐘）"
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "查詢成功",
                    content = @Content(schema = @Schema(implementation = NeighborhoodResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "查無資料（code=404）")
    })
    public ApiResponse<NeighborhoodResponse> getById(
            @Parameter(description = "鄰里 ID", required = true)
            @PathVariable Long id
    ) {
        Neighborhood nb = neighborhoodQueryService.getById(id);
        if (nb == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "Neighborhood not found");
        }
        return ApiResponse.success(NeighborhoodResponse.from(nb));
    }
}
