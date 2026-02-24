package com.example.app.controller;

import com.example.app.common.context.NeighborhoodContext;
import com.example.app.common.interceptor.NeighborhoodInterceptor;
import com.example.app.common.result.PageResult;
import com.example.app.entity.Neighborhood;
import com.example.app.service.NeighborhoodQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc integration tests for {@link NeighborhoodController}.
 * Uses the full Spring Boot context (H2 in-memory, no Redis/Rabbit)
 * with {@link NeighborhoodQueryService} mocked at the service boundary.
 */
@SpringBootTest
@AutoConfigureMockMvc
class NeighborhoodControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean NeighborhoodQueryService neighborhoodQueryService;

    // ── GET /api/v1/neighborhoods ─────────────────────────────

    @Test
    void list_defaultParams_returnsPage() throws Exception {
        PageResult<Neighborhood> page = new PageResult<>(2L, List.of(
                neighborhood(1L, "信義里", "信義區", "台北市"),
                neighborhood(2L, "大安里", "大安區", "台北市")
        ));
        when(neighborhoodQueryService.list(isNull(), isNull(), isNull(), eq(1), eq(20)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/neighborhoods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(2))
                .andExpect(jsonPath("$.data.records.length()").value(2))
                .andExpect(jsonPath("$.data.records[0].name").value("信義里"))
                .andExpect(jsonPath("$.data.records[1].name").value("大安里"));
    }

    @Test
    void list_withFilters_passesParamsToService() throws Exception {
        PageResult<Neighborhood> page = new PageResult<>(1L, List.of(
                neighborhood(3L, "東區里", "東區", "台中市")
        ));
        when(neighborhoodQueryService.list(eq("東"), eq("台中市"), eq("東區"), eq(2), eq(10)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/neighborhoods")
                        .param("keyword", "東")
                        .param("cityCode", "台中市")
                        .param("districtCode", "東區")
                        .param("page", "2")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].city").value("台中市"));
    }

    @Test
    void list_pageZero_returns422() throws Exception {
        mockMvc.perform(get("/api/v1/neighborhoods").param("page", "0"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value(422));
    }

    @Test
    void list_sizeOverMax_returns422() throws Exception {
        mockMvc.perform(get("/api/v1/neighborhoods").param("size", "101"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value(422));
    }

    // ── GET /api/v1/neighborhoods/{id} ────────────────────────

    @Test
    void getById_found_returnsNeighborhood() throws Exception {
        when(neighborhoodQueryService.getById(1L))
                .thenReturn(neighborhood(1L, "信義里", "信義區", "台北市"));

        mockMvc.perform(get("/api/v1/neighborhoods/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("信義里"))
                .andExpect(jsonPath("$.data.district").value("信義區"))
                .andExpect(jsonPath("$.data.city").value("台北市"))
                .andExpect(jsonPath("$.data.status").value(1));
    }

    @Test
    void getById_notFound_returnsCode404() throws Exception {
        when(neighborhoodQueryService.getById(999L)).thenReturn(null);

        // GlobalExceptionHandler#handleBusiness has no @ResponseStatus → HTTP 200,
        // application-level error code 404 is carried in the response body.
        mockMvc.perform(get("/api/v1/neighborhoods/999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    // ── X-NGB-ID interceptor ─────────────────────────────────

    @Test
    void ngbIdHeader_valid_proceedsAndSetsContext() throws Exception {
        // Interceptor calls getById to validate; controller list call also uses the mock.
        when(neighborhoodQueryService.getById(10L))
                .thenReturn(neighborhood(10L, "信義里", "信義區", "台北市"));
        when(neighborhoodQueryService.list(isNull(), isNull(), isNull(), eq(1), eq(20)))
                .thenReturn(new PageResult<>(0L, List.of()));

        mockMvc.perform(get("/api/v1/neighborhoods")
                        .header(NeighborhoodInterceptor.HEADER, "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // ThreadLocal must be cleared after the request completes
        org.assertj.core.api.Assertions.assertThat(NeighborhoodContext.getCurrentId()).isNull();
    }

    @Test
    void ngbIdHeader_notFound_returnsCode400() throws Exception {
        when(neighborhoodQueryService.getById(99L)).thenReturn(null);

        // GlobalExceptionHandler#handleBusiness has no @ResponseStatus → HTTP 200,
        // application-level error code 400 in body.
        mockMvc.perform(get("/api/v1/neighborhoods")
                        .header(NeighborhoodInterceptor.HEADER, "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ── helpers ──────────────────────────────────────────────

    private Neighborhood neighborhood(Long id, String name, String district, String city) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setName(name);
        n.setDistrict(district);
        n.setCity(city);
        n.setStatus(1);
        return n;
    }
}
