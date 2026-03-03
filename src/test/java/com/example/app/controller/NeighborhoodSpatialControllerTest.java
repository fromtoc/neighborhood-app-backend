package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.neighborhood.IntersectResponse;
import com.example.app.dto.neighborhood.LocateResponse;
import com.example.app.service.NeighborhoodSpatialService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc integration tests for spatial endpoints in {@link NeighborhoodController}.
 * Uses the full Spring Boot context (H2, no Redis/Rabbit)
 * with the service layer mocked at the service boundary.
 */
@SpringBootTest
@AutoConfigureMockMvc
class NeighborhoodSpatialControllerTest {

    private static final String LOCATE_URL = "/api/v1/neighborhoods/locate";
    private static final String NEARBY_URL = "/api/v1/neighborhoods/nearby";

    @Autowired
    MockMvc mockMvc;

    @MockBean
    NeighborhoodSpatialService neighborhoodSpatialService;

    // ── locate / GPS ──────────────────────────────────────────────

    @Test
    void locate_gps_success() throws Exception {
        when(neighborhoodSpatialService.locate(eq(25.033), eq(121.565), isNull()))
                .thenReturn(locateResponse());

        mockMvc.perform(get(LOCATE_URL)
                        .param("lat", "25.033")
                        .param("lng", "121.565"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("信義里"))
                .andExpect(jsonPath("$.data.city").value("台北市"));
    }

    // ── locate / address ──────────────────────────────────────────

    @Test
    void locate_address_success() throws Exception {
        when(neighborhoodSpatialService.locate(isNull(), isNull(), eq("台北市信義區信義路五段7號")))
                .thenReturn(locateResponse());

        mockMvc.perform(get(LOCATE_URL)
                        .param("address", "台北市信義區信義路五段7號"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.id").value(1));
    }

    // ── locate / not found → code=404 ────────────────────────────

    @Test
    void locate_notFound_returns404body() throws Exception {
        when(neighborhoodSpatialService.locate(any(), any(), any()))
                .thenThrow(new BusinessException(ResultCode.NOT_FOUND, "找不到所在里"));

        mockMvc.perform(get(LOCATE_URL)
                        .param("lat", "0.0")
                        .param("lng", "0.0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(404));
    }

    // ── locate / no params → code=400 ────────────────────────────

    @Test
    void locate_noParams_returns400body() throws Exception {
        when(neighborhoodSpatialService.locate(isNull(), isNull(), isNull()))
                .thenThrow(new BusinessException(ResultCode.BAD_REQUEST, "請提供 lat/lng 或 address 參數"));

        mockMvc.perform(get(LOCATE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ── nearby / success ──────────────────────────────────────────

    @Test
    void nearby_success() throws Exception {
        when(neighborhoodSpatialService.nearby(eq(25.033), eq(121.565), eq(500)))
                .thenReturn(List.of(intersectResponse()));

        mockMvc.perform(get(NEARBY_URL)
                        .param("lat", "25.033")
                        .param("lng", "121.565")
                        .param("radius", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].distanceMeter").value(120));
    }

    // ── nearby / radius out of range → HTTP 422 ──────────────────

    @Test
    void nearby_radiusOutOfRange_returns422() throws Exception {
        mockMvc.perform(get(NEARBY_URL)
                        .param("lat", "25.033")
                        .param("lng", "121.565")
                        .param("radius", "0"))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── helpers ───────────────────────────────────────────────────

    private LocateResponse locateResponse() {
        return LocateResponse.builder()
                .id(1L)
                .liCode("63000010001")
                .name("信義里")
                .fullName("台北市信義區信義里")
                .district("信義區")
                .city("台北市")
                .lat(new BigDecimal("25.0330000"))
                .lng(new BigDecimal("121.5650000"))
                .status(1)
                .build();
    }

    private IntersectResponse intersectResponse() {
        return IntersectResponse.builder()
                .id(1L)
                .liCode("63000010001")
                .name("信義里")
                .fullName("台北市信義區信義里")
                .district("信義區")
                .city("台北市")
                .lat(new BigDecimal("25.0330000"))
                .lng(new BigDecimal("121.5650000"))
                .status(1)
                .distanceMeter(120)
                .build();
    }
}
