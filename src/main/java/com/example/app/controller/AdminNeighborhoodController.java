package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.admin.ImportResult;
import com.example.app.service.NeighborhoodGeoJsonImportService;
import com.example.app.service.NeighborhoodImportService;
import com.example.app.service.SeoUrlService;
import com.example.app.service.WebRevalidateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Tag(name = "Admin - Neighborhood", description = "Neighborhood admin operations")
@RestController
@RequestMapping("/api/v1/admin/neighborhood")
@RequiredArgsConstructor
public class AdminNeighborhoodController {

    private final NeighborhoodImportService        neighborhoodImportService;
    private final NeighborhoodGeoJsonImportService neighborhoodGeoJsonImportService;
    private final SeoUrlService                    seoUrlService;
    private final WebRevalidateService             webRevalidateService;

    @Operation(
            summary = "Bulk-import neighborhoods from CSV",
            description = "Accepts a UTF-8 CSV file and upserts records by li_code. Requires ADMIN role.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/import")
    public ApiResponse<ImportResult> importCsv(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "file must not be empty");
        }

        ImportResult result = neighborhoodImportService.importCsv(file.getInputStream());
        return ApiResponse.success(result);
    }

    @Operation(
            summary = "Bulk-import neighborhoods from NLSC GeoJSON",
            description = "Accepts a GeoJSON FeatureCollection (VILLAGE_NLSC format) and upserts records by li_code (VILLCODE). Requires ADMIN role.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/import-geojson")
    public ApiResponse<ImportResult> importGeoJson(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "file must not be empty");
        }

        ImportResult result = neighborhoodGeoJsonImportService.importGeoJson(file.getInputStream());
        if (result.getSuccessCount() > 0) {
            seoUrlService.rebuildNeighborhoods();                          // async
            webRevalidateService.revalidatePaths(List.of("/sitemap.xml")); // async
        }
        return ApiResponse.success(result);
    }

    @Operation(
            summary = "重建 SEO URL 索引",
            description = "全量掃描 neighborhood / place / post 並寫入 seo_url 表。非同步執行，立即回傳。",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/seo/rebuild")
    public ApiResponse<String> rebuildSeoUrls() {
        seoUrlService.rebuildNeighborhoods();
        return ApiResponse.success("SEO URL rebuild started (async)");
    }
}
