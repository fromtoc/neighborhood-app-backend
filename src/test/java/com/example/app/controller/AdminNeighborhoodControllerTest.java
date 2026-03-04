package com.example.app.controller;

import com.example.app.dto.admin.CsvRowError;
import com.example.app.dto.admin.ImportResult;
import com.example.app.service.NeighborhoodGeoJsonImportService;
import com.example.app.service.NeighborhoodImportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc integration tests for {@link AdminNeighborhoodController}.
 * Uses the full Spring Boot context (H2, no Redis/Rabbit)
 * with service layer mocked at the service boundary.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminNeighborhoodControllerTest {

    private static final String IMPORT_URL         = "/api/v1/admin/neighborhood/import";
    private static final String IMPORT_GEOJSON_URL = "/api/v1/admin/neighborhood/import-geojson";

    @Autowired
    MockMvc mockMvc;

    @MockBean
    NeighborhoodImportService neighborhoodImportService;

    @MockBean
    NeighborhoodGeoJsonImportService neighborhoodGeoJsonImportService;

    // ── success ──────────────────────────────────────────────────

    @Test
    void import_success() throws Exception {
        when(neighborhoodImportService.importCsv(any()))
                .thenReturn(ImportResult.builder()
                        .successCount(3)
                        .failureCount(0)
                        .errors(List.of())
                        .build());

        MockMultipartFile file = csvFile("city_code,district_code,li_code,name,full_name,lat,lng,status\n"
                + "台北市,信義區,A001,信義里,台北市信義區信義里,25.033,121.565,1\n"
                + "台北市,信義區,A002,大安里,台北市信義區大安里,25.034,121.566,1\n"
                + "台北市,信義區,A003,松山里,台北市信義區松山里,25.035,121.567,1\n");

        mockMvc.perform(multipart(IMPORT_URL).file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.successCount").value(3))
                .andExpect(jsonPath("$.data.failureCount").value(0))
                .andExpect(jsonPath("$.data.errors").isEmpty());
    }

    // ── partial failure ───────────────────────────────────────────

    @Test
    void import_partialFailure() throws Exception {
        when(neighborhoodImportService.importCsv(any()))
                .thenReturn(ImportResult.builder()
                        .successCount(2)
                        .failureCount(1)
                        .errors(List.of(new CsvRowError(3, "li_code is required")))
                        .build());

        MockMultipartFile file = csvFile("city_code,district_code,li_code,name,full_name,lat,lng,status\n"
                + "台北市,信義區,A001,信義里,,,,1\n"
                + "台北市,信義區,A002,大安里,,,,1\n"
                + "台北市,信義區,,,,,,1\n");  // missing li_code

        mockMvc.perform(multipart(IMPORT_URL).file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.successCount").value(2))
                .andExpect(jsonPath("$.data.failureCount").value(1))
                .andExpect(jsonPath("$.data.errors[0].row").value(3))
                .andExpect(jsonPath("$.data.errors[0].message").value("li_code is required"));
    }

    // ── empty file → 400 (body) ────────────────────────────────────

    @Test
    void import_emptyFile_returns400() throws Exception {
        MockMultipartFile empty = new MockMultipartFile(
                "file", "empty.csv", MediaType.TEXT_PLAIN_VALUE, new byte[0]);

        mockMvc.perform(multipart(IMPORT_URL).file(empty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ── GeoJSON import ────────────────────────────────────────────

    @Test
    void importGeoJson_success() throws Exception {
        when(neighborhoodGeoJsonImportService.importGeoJson(any()))
                .thenReturn(ImportResult.builder()
                        .successCount(7956)
                        .failureCount(0)
                        .errors(List.of())
                        .build());

        mockMvc.perform(multipart(IMPORT_GEOJSON_URL).file(geoJsonFile("{\"type\":\"FeatureCollection\",\"features\":[]}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.successCount").value(7956))
                .andExpect(jsonPath("$.data.failureCount").value(0));
    }

    @Test
    void importGeoJson_emptyFile_returns400() throws Exception {
        MockMultipartFile empty = new MockMultipartFile(
                "file", "empty.json", MediaType.APPLICATION_JSON_VALUE, new byte[0]);

        mockMvc.perform(multipart(IMPORT_GEOJSON_URL).file(empty))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ── helpers ───────────────────────────────────────────────────

    private MockMultipartFile csvFile(String content) {
        return new MockMultipartFile(
                "file", "neighborhoods.csv",
                MediaType.TEXT_PLAIN_VALUE,
                content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private MockMultipartFile geoJsonFile(String content) {
        return new MockMultipartFile(
                "file", "neighborhoods.json",
                MediaType.APPLICATION_JSON_VALUE,
                content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
