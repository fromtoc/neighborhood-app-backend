package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.PageResult;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.neighborhood.NeighborhoodResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.service.NeighborhoodQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/neighborhoods")
@RequiredArgsConstructor
@Validated
@Tag(name = "Neighborhood", description = "鄰里查詢 API")
public class NeighborhoodController {

    private final NeighborhoodQueryService neighborhoodQueryService;

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
