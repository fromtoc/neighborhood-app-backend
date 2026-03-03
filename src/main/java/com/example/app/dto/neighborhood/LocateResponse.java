package com.example.app.dto.neighborhood;

import com.example.app.entity.Neighborhood;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
@Schema(description = "里定位結果")
public class LocateResponse {

    @Schema(description = "鄰里 ID", example = "1")
    private Long id;

    @Schema(description = "里代碼", example = "63000010001")
    private String liCode;

    @Schema(description = "里名稱", example = "信義里")
    private String name;

    @Schema(description = "里全名", example = "台北市信義區信義里")
    private String fullName;

    @Schema(description = "行政區", example = "信義區")
    private String district;

    @Schema(description = "縣市", example = "台北市")
    private String city;

    @Schema(description = "里中心緯度", example = "25.0330000")
    private BigDecimal lat;

    @Schema(description = "里中心經度", example = "121.5650000")
    private BigDecimal lng;

    @Schema(description = "狀態 (1=啟用 0=停用)", example = "1")
    private Integer status;

    public static LocateResponse from(Neighborhood n) {
        return LocateResponse.builder()
                .id(n.getId())
                .liCode(n.getLiCode())
                .name(n.getName())
                .fullName(n.getFullName())
                .district(n.getDistrict())
                .city(n.getCity())
                .lat(n.getLat())
                .lng(n.getLng())
                .status(n.getStatus())
                .build();
    }
}
