package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.result.ApiResponse;
import com.example.app.dto.banner.BannerItemResponse;
import com.example.app.entity.BannerItem;
import com.example.app.entity.BannerSlot;
import com.example.app.mapper.BannerItemMapper;
import com.example.app.mapper.BannerSlotMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BannerControllerTest {

    @Mock BannerSlotMapper bannerSlotMapper;
    @Mock BannerItemMapper bannerItemMapper;

    @InjectMocks BannerController controller;

    // ── list ──────────────────────────────────────────────────

    @Test
    void list_slotExistsWithItems_returnsItemList() {
        BannerSlot slot = slot(1L, "home_top", 5);
        BannerItem item1 = item(10L, 1L, "post", 100L, "img1.jpg", "標題一", 0);
        BannerItem item2 = item(11L, 1L, "place", 200L, "img2.jpg", "標題二", 1);

        when(bannerSlotMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(slot);
        when(bannerItemMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(item1, item2));

        ApiResponse<List<BannerItemResponse>> resp = controller.list("home_top");

        assertThat(resp.getCode()).isEqualTo(200);
        assertThat(resp.getData()).hasSize(2);
        assertThat(resp.getData().get(0).getId()).isEqualTo(10L);
        assertThat(resp.getData().get(0).getTitle()).isEqualTo("標題一");
        assertThat(resp.getData().get(1).getId()).isEqualTo(11L);
    }

    @Test
    void list_slotNotFound_returnsEmptyList() {
        when(bannerSlotMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        ApiResponse<List<BannerItemResponse>> resp = controller.list("nonexistent");

        assertThat(resp.getCode()).isEqualTo(200);
        assertThat(resp.getData()).isEmpty();
        verify(bannerItemMapper, never()).selectList(any());
    }

    @Test
    void list_slotExistsButNoItems_returnsEmptyList() {
        BannerSlot slot = slot(1L, "home_top", 5);
        when(bannerSlotMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(slot);
        when(bannerItemMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        ApiResponse<List<BannerItemResponse>> resp = controller.list("home_top");

        assertThat(resp.getCode()).isEqualTo(200);
        assertThat(resp.getData()).isEmpty();
    }

    @Test
    void list_itemWithStartAtAndEndAt_responseIncludesTimes() {
        BannerSlot slot = slot(1L, "home_top", 5);
        BannerItem item = item(10L, 1L, "post", 100L, "img.jpg", "限時活動", 0);
        item.setStartAt(LocalDateTime.of(2026, 1, 1, 0, 0));
        item.setEndAt(LocalDateTime.of(2026, 12, 31, 23, 59));

        when(bannerSlotMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(slot);
        when(bannerItemMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(item));

        ApiResponse<List<BannerItemResponse>> resp = controller.list("home_top");

        assertThat(resp.getData()).hasSize(1);
        BannerItemResponse r = resp.getData().get(0);
        assertThat(r.getStartAt()).isEqualTo("2026-01-01T00:00");
        assertThat(r.getEndAt()).isEqualTo("2026-12-31T23:59");
    }

    @Test
    void list_itemWithNullStartAtEndAt_responseTimesAreNull() {
        BannerSlot slot = slot(1L, "home_top", 5);
        BannerItem item = item(10L, 1L, "post", 100L, "img.jpg", "永久廣告", 0);
        // startAt, endAt default to null

        when(bannerSlotMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(slot);
        when(bannerItemMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(item));

        ApiResponse<List<BannerItemResponse>> resp = controller.list("home_top");

        BannerItemResponse r = resp.getData().get(0);
        assertThat(r.getStartAt()).isNull();
        assertThat(r.getEndAt()).isNull();
    }

    // ── helpers ───────────────────────────────────────────────

    private BannerSlot slot(Long id, String name, int maxItems) {
        BannerSlot s = new BannerSlot();
        s.setId(id);
        s.setName(name);
        s.setLabel(name);
        s.setMaxItems(maxItems);
        s.setSortOrder(0);
        s.setStatus(1);
        return s;
    }

    private BannerItem item(Long id, Long slotId, String sourceType, Long sourceId,
                            String imageUrl, String title, int sortOrder) {
        BannerItem i = new BannerItem();
        i.setId(id);
        i.setSlotId(slotId);
        i.setSourceType(sourceType);
        i.setSourceId(sourceId);
        i.setImageUrl(imageUrl);
        i.setTitle(title);
        i.setSortOrder(sortOrder);
        i.setStatus(1);
        return i;
    }
}
