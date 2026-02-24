package com.example.app.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.cache.CacheKeys;
import com.example.app.common.result.PageResult;
import com.example.app.dto.neighborhood.NeighborhoodRecommendResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.impl.NeighborhoodQueryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NeighborhoodQueryServiceTest {

    @Mock NeighborhoodMapper neighborhoodMapper;
    @Mock RedisTemplate<String, Object> redisTemplate;
    @Mock ValueOperations<String, Object> valueOps;

    @InjectMocks
    NeighborhoodQueryServiceImpl service;

    @BeforeEach
    void setUp() {
        // @InjectMocks uses constructor injection and stops — redisTemplate (optional field)
        // is never injected automatically; set it explicitly via reflection.
        ReflectionTestUtils.setField(service, "redisTemplate", redisTemplate);
        // lenient: recommend() doesn't touch Redis, so this stub is unused in those tests.
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
    }

    // ── getById ─────────────────────────────────────────────

    @Test
    void getById_cacheHit() {
        Neighborhood n = neighborhood(1L, "信義里");
        when(valueOps.get(CacheKeys.neighborhoodDetail(1L))).thenReturn(n);

        assertThat(service.getById(1L).getName()).isEqualTo("信義里");
        verifyNoInteractions(neighborhoodMapper);
    }

    @Test
    void getById_cacheMiss_queriesDbAndCaches() {
        // valueOps.get returns null by default → cache miss
        Neighborhood n = neighborhood(2L, "大安里");
        when(neighborhoodMapper.selectById(2L)).thenReturn(n);

        Neighborhood result = service.getById(2L);

        assertThat(result.getName()).isEqualTo("大安里");
        verify(valueOps).set(CacheKeys.neighborhoodDetail(2L), n, Duration.ofMinutes(30));
    }

    @Test
    void getById_notFound_doesNotCache() {
        // both valueOps.get and selectById return null by default
        assertThat(service.getById(99L)).isNull();
        verify(valueOps, never()).set(any(), any(), any(Duration.class));
    }

    // ── list ────────────────────────────────────────────────

    @Test
    void list_cacheHit() {
        PageResult<Neighborhood> cached = new PageResult<>(1L, List.of(neighborhood(1L, "信義里")));
        when(valueOps.get(anyString())).thenReturn(cached);

        assertThat(service.list(null, null, null, 1, 10).getTotal()).isEqualTo(1L);
        verifyNoInteractions(neighborhoodMapper);
    }

    @Test
    void list_cacheMiss_queriesDbAndCaches() {
        // valueOps.get returns null by default → cache miss
        Page<Neighborhood> page = new Page<>();
        page.setTotal(2L);
        page.setRecords(List.of(neighborhood(1L, "A里"), neighborhood(2L, "B里")));
        when(neighborhoodMapper.selectPage(any(), any())).thenReturn(page);

        PageResult<Neighborhood> result = service.list("里", "台北市", "信義區", 1, 10);

        assertThat(result.getTotal()).isEqualTo(2L);
        assertThat(result.getRecords()).hasSize(2);
        verify(valueOps).set(
                eq(CacheKeys.neighborhoodList("台北市", "信義區", "里", 1, 10)),
                any(PageResult.class),
                eq(Duration.ofMinutes(20))
        );
    }

    // ── recommend ───────────────────────────────────────────────

    /**
     * Origin (25.0, 121.5).  6 candidates at increasing lat offsets → id 1–5 returned,
     * id=6 (~1113m) excluded.  Results must be distance-ascending.
     *
     * Approximate Haversine distances from origin:
     *   id=1: 0.001° lat → ~111 m
     *   id=2: 0.002° lat → ~222 m
     *   id=3: 0.003° lat → ~333 m
     *   id=4: 0.004° lat → ~445 m
     *   id=5: 0.005° lat → ~556 m
     *   id=6: 0.010° lat → ~1113 m  (6th, excluded)
     */
    @Test
    void recommend_returnsTop5SortedByDistance() {
        when(neighborhoodMapper.selectList(any())).thenReturn(List.of(
                nbhGeo(6L, "F里", 25.010, 121.5),
                nbhGeo(4L, "D里", 25.004, 121.5),
                nbhGeo(2L, "B里", 25.002, 121.5),
                nbhGeo(1L, "A里", 25.001, 121.5),
                nbhGeo(5L, "E里", 25.005, 121.5),
                nbhGeo(3L, "C里", 25.003, 121.5)
        ));

        List<NeighborhoodRecommendResponse> result = service.recommend(25.0, 121.5);

        assertThat(result).hasSize(5);
        assertThat(result).extracting(NeighborhoodRecommendResponse::getId)
                .containsExactly(1L, 2L, 3L, 4L, 5L);
        // distances must be strictly ascending
        assertThat(result).extracting(NeighborhoodRecommendResponse::getDistanceMeter)
                .isSortedAccordingTo(Integer::compareTo);
        // approximate range checks
        assertThat(result.get(0).getDistanceMeter()).isBetween(100, 125);   // ~111m
        assertThat(result.get(4).getDistanceMeter()).isBetween(545, 570);   // ~556m
    }

    @Test
    void recommend_fewerThan5_returnsAll() {
        when(neighborhoodMapper.selectList(any())).thenReturn(List.of(
                nbhGeo(1L, "A里", 25.001, 121.5),
                nbhGeo(2L, "B里", 25.002, 121.5)
        ));

        List<NeighborhoodRecommendResponse> result = service.recommend(25.0, 121.5);

        assertThat(result).hasSize(2);
    }

    @Test
    void recommend_fullNameMapped() {
        when(neighborhoodMapper.selectList(any())).thenReturn(List.of(
                nbhGeo(1L, "台北市信義區信義里", 25.001, 121.5)
        ));

        List<NeighborhoodRecommendResponse> result = service.recommend(25.0, 121.5);

        assertThat(result.get(0).getFullName()).isEqualTo("台北市信義區信義里");
        assertThat(result.get(0).getId()).isEqualTo(1L);
    }

    // ── helper ──────────────────────────────────────────────

    private Neighborhood neighborhood(Long id, String name) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setName(name);
        return n;
    }

    private Neighborhood nbhGeo(Long id, String fullName, double lat, double lng) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setFullName(fullName);
        n.setLat(BigDecimal.valueOf(lat));
        n.setLng(BigDecimal.valueOf(lng));
        n.setStatus(1);
        return n;
    }
}
