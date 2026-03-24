package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.banner.BannerItemResponse;
import com.example.app.dto.banner.BannerSlotResponse;
import com.example.app.entity.BannerItem;
import com.example.app.entity.BannerSlot;
import com.example.app.mapper.BannerItemMapper;
import com.example.app.mapper.BannerSlotMapper;
import com.example.app.mapper.PlaceMapper;
import com.example.app.mapper.PostMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminBannerControllerTest {

    @Mock BannerSlotMapper bannerSlotMapper;
    @Mock BannerItemMapper bannerItemMapper;
    @Mock PostMapper postMapper;
    @Mock PlaceMapper placeMapper;

    @InjectMocks AdminBannerController controller;

    // ── requireAdmin 權限檢查 ─────────────────────────────────

    @Test
    void requireAdmin_nullClaims_throwsUnauthorized() {
        assertThatThrownBy(() -> controller.listSlots(null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(401));
    }

    @Test
    void requireAdmin_guestRole_throwsForbidden() {
        JwtClaims guest = JwtClaims.builder().userId(1L).role(UserRole.GUEST).build();

        assertThatThrownBy(() -> controller.listSlots(guest))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(403));
    }

    @Test
    void requireAdmin_userRole_throwsForbidden() {
        JwtClaims user = JwtClaims.builder().userId(1L).role(UserRole.USER).build();

        assertThatThrownBy(() -> controller.listSlots(user))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(403));
    }

    @Test
    void requireAdmin_liChiefRole_throwsForbidden() {
        JwtClaims chief = JwtClaims.builder().userId(1L).role(UserRole.LI_CHIEF).build();

        assertThatThrownBy(() -> controller.listSlots(chief))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(403));
    }

    @Test
    void requireAdmin_adminRole_passes() {
        JwtClaims admin = adminClaims();
        when(bannerSlotMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        // Should not throw
        controller.listSlots(admin);
    }

    @Test
    void requireAdmin_superAdminRole_passes() {
        JwtClaims superAdmin = JwtClaims.builder().userId(1L).role(UserRole.SUPER_ADMIN).build();
        when(bannerSlotMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        controller.listSlots(superAdmin);
    }

    // ── listSlots ─────────────────────────────────────────────

    @Test
    void listSlots_returnsAllSlots() {
        BannerSlot s1 = slot(1L, "home_top", "首頁頂部");
        BannerSlot s2 = slot(2L, "home_bottom", "首頁底部");
        when(bannerSlotMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(s1, s2));

        ApiResponse<List<BannerSlotResponse>> resp = controller.listSlots(adminClaims());

        assertThat(resp.getCode()).isEqualTo(200);
        assertThat(resp.getData()).hasSize(2);
        assertThat(resp.getData().get(0).getName()).isEqualTo("home_top");
        assertThat(resp.getData().get(1).getName()).isEqualTo("home_bottom");
    }

    @Test
    void listSlots_empty_returnsEmptyList() {
        when(bannerSlotMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        ApiResponse<List<BannerSlotResponse>> resp = controller.listSlots(adminClaims());

        assertThat(resp.getData()).isEmpty();
    }

    // ── createItem ────────────────────────────────────────────

    @Test
    void createItem_validInput_returnsCreatedItem() {
        BannerSlot slot = slot(1L, "home_top", "首頁頂部");
        when(bannerSlotMapper.selectById(1L)).thenReturn(slot);
        when(bannerItemMapper.insert(any(BannerItem.class))).thenReturn(1);

        Map<String, Object> body = Map.of(
                "slotId", 1,
                "sourceType", "post",
                "sourceId", 100,
                "imageUrl", "https://img.example.com/1.jpg",
                "title", "新廣告"
        );

        ApiResponse<BannerItemResponse> resp = controller.createItem(adminClaims(), body);

        assertThat(resp.getCode()).isEqualTo(200);
        assertThat(resp.getData().getSlotId()).isEqualTo(1L);
        assertThat(resp.getData().getSourceType()).isEqualTo("post");
        assertThat(resp.getData().getTitle()).isEqualTo("新廣告");
        assertThat(resp.getData().getStatus()).isEqualTo(1);
        verify(bannerItemMapper).insert(any(BannerItem.class));
    }

    @Test
    void createItem_slotNotFound_throwsNotFound() {
        when(bannerSlotMapper.selectById(99L)).thenReturn(null);

        Map<String, Object> body = Map.of(
                "slotId", 99,
                "sourceType", "post",
                "sourceId", 1,
                "imageUrl", "img.jpg",
                "title", "test"
        );

        assertThatThrownBy(() -> controller.createItem(adminClaims(), body))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(404));
    }

    @Test
    void createItem_nonAdmin_throwsForbidden() {
        JwtClaims user = JwtClaims.builder().userId(1L).role(UserRole.USER).build();

        Map<String, Object> body = Map.of(
                "slotId", 1,
                "sourceType", "post",
                "sourceId", 1,
                "imageUrl", "img.jpg",
                "title", "test"
        );

        assertThatThrownBy(() -> controller.createItem(user, body))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(403));
    }

    // ── deleteItem ────────────────────────────────────────────

    @Test
    void deleteItem_exists_deletesSuccessfully() {
        BannerItem item = new BannerItem();
        item.setId(10L);
        when(bannerItemMapper.selectById(10L)).thenReturn(item);
        when(bannerItemMapper.deleteById(10L)).thenReturn(1);

        ApiResponse<Void> resp = controller.deleteItem(adminClaims(), 10L);

        assertThat(resp.getCode()).isEqualTo(200);
        verify(bannerItemMapper).deleteById(10L);
    }

    @Test
    void deleteItem_notFound_throwsNotFound() {
        when(bannerItemMapper.selectById(99L)).thenReturn(null);

        assertThatThrownBy(() -> controller.deleteItem(adminClaims(), 99L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(404));
    }

    @Test
    void deleteItem_nonAdmin_throwsForbidden() {
        JwtClaims user = JwtClaims.builder().userId(1L).role(UserRole.USER).build();

        assertThatThrownBy(() -> controller.deleteItem(user, 10L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(403));
    }

    // ── helpers ───────────────────────────────────────────────

    private JwtClaims adminClaims() {
        return JwtClaims.builder().userId(1L).role(UserRole.ADMIN).build();
    }

    private BannerSlot slot(Long id, String name, String label) {
        BannerSlot s = new BannerSlot();
        s.setId(id);
        s.setName(name);
        s.setLabel(label);
        s.setMaxItems(10);
        s.setSortOrder(0);
        s.setStatus(1);
        return s;
    }
}
