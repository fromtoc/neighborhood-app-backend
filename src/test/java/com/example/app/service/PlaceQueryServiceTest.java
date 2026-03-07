package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.result.PageResult;
import com.example.app.entity.Place;
import com.example.app.mapper.PlaceMapper;
import com.example.app.service.impl.PlaceQueryServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlaceQueryServiceTest {

    @Mock PlaceMapper placeMapper;

    @InjectMocks PlaceQueryServiceImpl service;

    // ── listByNeighborhood ────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void listByNeighborhood_returnsPaginatedResult() {
        Place p = place(1L, "好吃便當", 10L, 101L);
        Page<Place> page = new Page<>(1, 20);
        page.setRecords(List.of(p));
        page.setTotal(1L);

        when(placeMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(page);

        PageResult<Place> result = service.listByNeighborhood(10L, null, null, 1, 20);

        assertThat(result.getTotal()).isEqualTo(1);
        assertThat(result.getRecords()).hasSize(1);
        assertThat(result.getRecords().get(0).getName()).isEqualTo("好吃便當");
    }

    @Test
    @SuppressWarnings("unchecked")
    void listByNeighborhood_emptyResult() {
        Page<Place> page = new Page<>(1, 20);
        page.setRecords(List.of());
        page.setTotal(0L);

        when(placeMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenReturn(page);

        PageResult<Place> result = service.listByNeighborhood(10L, null, null, 1, 20);

        assertThat(result.getTotal()).isEqualTo(0);
        assertThat(result.getRecords()).isEmpty();
    }

    // ── getById ───────────────────────────────────────────────

    @Test
    void getById_found_returnsPlace() {
        Place p = place(1L, "好吃便當", 10L, 101L);
        when(placeMapper.selectById(1L)).thenReturn(p);

        Place result = service.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("好吃便當");
    }

    @Test
    void getById_notFound_returnsNull() {
        when(placeMapper.selectById(99L)).thenReturn(null);

        assertThat(service.getById(99L)).isNull();
    }

    // ── listAllByNeighborhood ─────────────────────────────────

    @Test
    void listAllByNeighborhood_returnsAll() {
        List<Place> places = List.of(
                place(1L, "便當A", 10L, 102L),
                place(2L, "便當B", 10L, 102L)
        );
        when(placeMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(places);

        List<Place> result = service.listAllByNeighborhood(10L, 102L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Place::getName).containsExactly("便當A", "便當B");
    }

    @Test
    void listAllByNeighborhood_noCategoryFilter_returnsAll() {
        when(placeMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertThat(service.listAllByNeighborhood(10L, null)).isEmpty();
    }

    // ── helper ────────────────────────────────────────────────

    private Place place(Long id, String name, Long neighborhoodId, Long categoryId) {
        Place p = new Place();
        p.setId(id);
        p.setName(name);
        p.setNeighborhoodId(neighborhoodId);
        p.setCategoryId(categoryId);
        p.setStatus(1);
        p.setDeleted(0);
        return p;
    }
}
