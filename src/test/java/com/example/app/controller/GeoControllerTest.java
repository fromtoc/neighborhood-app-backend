package com.example.app.controller;

import com.example.app.entity.Neighborhood;
import com.example.app.service.GeoQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class GeoControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean GeoQueryService geoQueryService;

    // ── /geo/cities ──────────────────────────────────────────

    @Test
    void cities_returnsList() throws Exception {
        when(geoQueryService.getCities()).thenReturn(List.of("台北市", "新北市"));

        mockMvc.perform(get("/api/v1/geo/cities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0]").value("台北市"))
                .andExpect(jsonPath("$.data[1]").value("新北市"));
    }

    @Test
    void cities_returnsEmptyList() throws Exception {
        when(geoQueryService.getCities()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/geo/cities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // ── /geo/districts ───────────────────────────────────────

    @Test
    void districts_validCity_returnsList() throws Exception {
        when(geoQueryService.getDistricts("台北市")).thenReturn(List.of("信義區", "大安區"));

        mockMvc.perform(get("/api/v1/geo/districts").param("city", "台北市"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("信義區"));
    }

    @Test
    void districts_missingCity_returns422() throws Exception {
        mockMvc.perform(get("/api/v1/geo/districts"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void districts_blankCity_returns422() throws Exception {
        mockMvc.perform(get("/api/v1/geo/districts").param("city", "  "))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── /geo/lis ─────────────────────────────────────────────

    @Test
    void lis_validParams_returnsList() throws Exception {
        when(geoQueryService.listLisByDistrict("台北市", "信義區"))
                .thenReturn(List.of(li(1L, "信義里", "信義區", "台北市")));

        mockMvc.perform(get("/api/v1/geo/lis")
                        .param("city", "台北市")
                        .param("district", "信義區"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("信義里"))
                .andExpect(jsonPath("$.data[0].city").value("台北市"));
    }

    @Test
    void lis_missingDistrict_returns422() throws Exception {
        mockMvc.perform(get("/api/v1/geo/lis").param("city", "台北市"))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── /geo/li ──────────────────────────────────────────────

    @Test
    void li_found_returnsData() throws Exception {
        when(geoQueryService.getLi("台北市", "信義區", "信義里"))
                .thenReturn(li(1L, "信義里", "信義區", "台北市"));

        mockMvc.perform(get("/api/v1/geo/li")
                        .param("city", "台北市")
                        .param("district", "信義區")
                        .param("li", "信義里"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("信義里"));
    }

    @Test
    void li_notFound_returns404() throws Exception {
        when(geoQueryService.getLi("台北市", "信義區", "不存在里")).thenReturn(null);

        mockMvc.perform(get("/api/v1/geo/li")
                        .param("city", "台北市")
                        .param("district", "信義區")
                        .param("li", "不存在里"))
                .andExpect(status().isOk())                       // HTTP 200, body code=404
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    void li_missingParam_returns422() throws Exception {
        mockMvc.perform(get("/api/v1/geo/li")
                        .param("city", "台北市")
                        .param("district", "信義區"))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── helper ───────────────────────────────────────────────

    private Neighborhood li(Long id, String name, String district, String city) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setName(name);
        n.setDistrict(district);
        n.setCity(city);
        n.setLat(new BigDecimal("25.0330"));
        n.setLng(new BigDecimal("121.5654"));
        n.setStatus(1);
        return n;
    }
}
