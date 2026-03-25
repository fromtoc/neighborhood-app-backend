package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.entity.NeighborhoodDemographics;
import com.example.app.mapper.NeighborhoodDemographicsMapper;
import com.example.app.mapper.NeighborhoodMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/neighborhoods")
@RequiredArgsConstructor
@Tag(name = "Demographics", description = "里人口統計 API")
public class DemographicsController {

    private final NeighborhoodDemographicsMapper demographicsMapper;
    private final NeighborhoodMapper neighborhoodMapper;

    @GetMapping("/{id}/demographics")
    @Operation(summary = "取得該里最新人口統計資料")
    public ApiResponse<Map<String, Object>> getDemographics(@PathVariable Long id) {
        if (neighborhoodMapper.selectById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "里不存在");
        }

        // 取得最新一期
        NeighborhoodDemographics demo = demographicsMapper.selectOne(
                new LambdaQueryWrapper<NeighborhoodDemographics>()
                        .eq(NeighborhoodDemographics::getNeighborhoodId, id)
                        .orderByDesc(NeighborhoodDemographics::getPeriod)
                        .last("LIMIT 1"));

        if (demo == null) {
            return ApiResponse.success(null);
        }

        String periodLabel = formatPeriodLabel(demo.getPeriod());

        return ApiResponse.success(Map.ofEntries(
                Map.entry("period", demo.getPeriod()),
                Map.entry("periodLabel", periodLabel),
                Map.entry("householdCount", demo.getHouseholdCount()),
                Map.entry("populationTotal", demo.getPopulationTotal()),
                Map.entry("populationMale", demo.getPopulationMale()),
                Map.entry("populationFemale", demo.getPopulationFemale()),
                Map.entry("birthTotal", demo.getBirthTotal()),
                Map.entry("birthMale", demo.getBirthMale()),
                Map.entry("birthFemale", demo.getBirthFemale()),
                Map.entry("deathTotal", demo.getDeathTotal()),
                Map.entry("deathMale", demo.getDeathMale()),
                Map.entry("deathFemale", demo.getDeathFemale()),
                Map.entry("marryCount", demo.getMarryCount()),
                Map.entry("divorceCount", demo.getDivorceCount())
        ));
    }

    /** "11502" → "114年2月" */
    private String formatPeriodLabel(String period) {
        if (period == null || period.length() < 5) return period;
        String year = period.substring(0, 3);
        String month = period.substring(3);
        int m = Integer.parseInt(month);
        return year + "年" + m + "月";
    }
}
