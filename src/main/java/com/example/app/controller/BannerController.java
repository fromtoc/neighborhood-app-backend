package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.result.ApiResponse;
import com.example.app.dto.banner.BannerItemResponse;
import com.example.app.entity.BannerItem;
import com.example.app.entity.BannerSlot;
import com.example.app.mapper.BannerItemMapper;
import com.example.app.mapper.BannerSlotMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
@Tag(name = "Banner", description = "輪播廣告 API")
public class BannerController {

    private final BannerSlotMapper bannerSlotMapper;
    private final BannerItemMapper bannerItemMapper;

    @GetMapping
    @Operation(summary = "取得指定廣告位的輪播項目")
    public ApiResponse<List<BannerItemResponse>> list(
            @RequestParam String slot
    ) {
        BannerSlot bannerSlot = bannerSlotMapper.selectOne(
                new LambdaQueryWrapper<BannerSlot>()
                        .eq(BannerSlot::getName, slot)
                        .eq(BannerSlot::getStatus, 1)
        );
        if (bannerSlot == null) {
            return ApiResponse.success(List.of());
        }

        LocalDateTime now = LocalDateTime.now();
        List<BannerItem> items = bannerItemMapper.selectList(
                new LambdaQueryWrapper<BannerItem>()
                        .eq(BannerItem::getSlotId, bannerSlot.getId())
                        .eq(BannerItem::getStatus, 1)
                        .and(w -> w
                                .isNull(BannerItem::getStartAt)
                                .or().le(BannerItem::getStartAt, now))
                        .and(w -> w
                                .isNull(BannerItem::getEndAt)
                                .or().ge(BannerItem::getEndAt, now))
                        .orderByAsc(BannerItem::getSortOrder)
                        .last("LIMIT " + bannerSlot.getMaxItems())
        );

        return ApiResponse.success(
                items.stream().map(BannerItemResponse::from).toList()
        );
    }
}
