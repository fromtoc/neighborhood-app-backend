package com.example.app.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.impl.GeoQueryServiceImpl;
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
class GeoQueryServiceTest {

    @Mock NeighborhoodQueryService neighborhoodQueryService;
    @Mock NeighborhoodMapper neighborhoodMapper;

    @InjectMocks GeoQueryServiceImpl service;

    // ── getCities ────────────────────────────────────────────

    @Test
    void getCities_delegatesToNeighborhoodQueryService() {
        when(neighborhoodQueryService.cities()).thenReturn(List.of("台北市", "新北市"));

        List<String> result = service.getCities();

        assertThat(result).containsExactly("台北市", "新北市");
        verify(neighborhoodQueryService).cities();
        verifyNoInteractions(neighborhoodMapper);
    }

    @Test
    void getCities_returnsEmptyWhenNoData() {
        when(neighborhoodQueryService.cities()).thenReturn(List.of());

        assertThat(service.getCities()).isEmpty();
    }

    // ── getDistricts ─────────────────────────────────────────

    @Test
    void getDistricts_delegatesToNeighborhoodQueryService() {
        when(neighborhoodQueryService.districts("台北市")).thenReturn(List.of("信義區", "大安區"));

        List<String> result = service.getDistricts("台北市");

        assertThat(result).containsExactly("信義區", "大安區");
        verify(neighborhoodQueryService).districts("台北市");
        verifyNoInteractions(neighborhoodMapper);
    }

    // ── listLisByDistrict ────────────────────────────────────

    @Test
    void listLisByDistrict_returnsMatchingLis() {
        List<Neighborhood> expected = List.of(
                li(1L, "信義里", "信義區", "台北市"),
                li(2L, "松山里", "信義區", "台北市")
        );
        when(neighborhoodMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expected);

        List<Neighborhood> result = service.listLisByDistrict("台北市", "信義區");

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Neighborhood::getName)
                .containsExactly("信義里", "松山里");
    }

    @Test
    void listLisByDistrict_returnsEmptyWhenNoneFound() {
        when(neighborhoodMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of());

        assertThat(service.listLisByDistrict("台北市", "不存在區")).isEmpty();
    }

    // ── getLi ────────────────────────────────────────────────

    @Test
    void getLi_returnsMatchingNeighborhood() {
        Neighborhood expected = li(1L, "信義里", "信義區", "台北市");
        when(neighborhoodMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(expected);

        Neighborhood result = service.getLi("台北市", "信義區", "信義里");

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("信義里");
        assertThat(result.getDistrict()).isEqualTo("信義區");
        assertThat(result.getCity()).isEqualTo("台北市");
    }

    @Test
    void getLi_returnsNullWhenNotFound() {
        when(neighborhoodMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        assertThat(service.getLi("台北市", "信義區", "不存在里")).isNull();
    }

    // ── helper ──────────────────────────────────────────────

    private Neighborhood li(Long id, String name, String district, String city) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setName(name);
        n.setDistrict(district);
        n.setCity(city);
        n.setStatus(1);
        return n;
    }
}
