package com.example.app.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.app.common.cache.CacheKeys;
import com.example.app.common.result.PageResult;
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
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
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

    // ── helper ──────────────────────────────────────────────

    private Neighborhood neighborhood(Long id, String name) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setName(name);
        return n;
    }
}
