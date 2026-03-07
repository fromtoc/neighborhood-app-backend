package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.geo.LiResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.service.GeoQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 地理層級 API — 縣市 / 行政區 / 里。
 *
 * <p>所有端點均 permitAll（已在 SecurityConfig 中設定 /api/v1/neighborhoods/**）。
 * 此 Controller 掛在 /api/v1/geo/，SecurityConfig 需同步放行。
 */
@RestController
@RequestMapping("/api/v1/geo")
@RequiredArgsConstructor
@Validated
@Tag(name = "Geo", description = "三層地理結構查詢 API（縣市 / 行政區 / 里）")
public class GeoController {

    private final GeoQueryService geoQueryService;

    @GetMapping("/cities")
    @Operation(summary = "取得縣市清單", description = "回傳所有縣市（distinct, 排序）")
    public ApiResponse<List<String>> cities() {
        return ApiResponse.success(geoQueryService.getCities());
    }

    @GetMapping("/districts")
    @Operation(summary = "取得行政區清單", description = "回傳指定縣市下的所有行政區（distinct, 排序）")
    public ApiResponse<List<String>> districts(
            @Parameter(description = "縣市名稱，例如「台北市」", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String city
    ) {
        return ApiResponse.success(geoQueryService.getDistricts(city));
    }

    @GetMapping("/lis")
    @Operation(summary = "取得里清單", description = "回傳指定縣市 + 行政區下的所有里（status=1）")
    public ApiResponse<List<LiResponse>> lis(
            @Parameter(description = "縣市名稱", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String city,

            @Parameter(description = "行政區名稱", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String district
    ) {
        List<Neighborhood> result = geoQueryService.listLisByDistrict(city, district);
        return ApiResponse.success(result.stream().map(LiResponse::from).toList());
    }

    @GetMapping("/li")
    @Operation(summary = "取得單筆里資料", description = "依縣市 + 行政區 + 里名稱查詢")
    public ApiResponse<LiResponse> li(
            @Parameter(description = "縣市名稱", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String city,

            @Parameter(description = "行政區名稱", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String district,

            @Parameter(description = "里名稱", required = true, in = ParameterIn.QUERY)
            @RequestParam(required = false) @NotBlank String li
    ) {
        Neighborhood nb = geoQueryService.getLi(city, district, li);
        if (nb == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "里資料不存在");
        }
        return ApiResponse.success(LiResponse.from(nb));
    }
}
