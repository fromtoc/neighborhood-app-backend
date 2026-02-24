package com.example.app.controller;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.admin.ImportResult;
import com.example.app.service.NeighborhoodImportService;
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

@Tag(name = "Admin - Neighborhood", description = "Neighborhood admin operations")
@RestController
@RequestMapping("/api/v1/admin/neighborhood")
@RequiredArgsConstructor
public class AdminNeighborhoodController {

    private final NeighborhoodImportService neighborhoodImportService;

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
}
