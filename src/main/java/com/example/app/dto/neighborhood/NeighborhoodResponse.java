package com.example.app.dto.neighborhood;

import com.example.app.common.result.PageResult;
import com.example.app.entity.Neighborhood;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "鄰里資訊")
public class NeighborhoodResponse {

    @Schema(description = "鄰里 ID", example = "1")
    private Long id;

    @Schema(description = "里代碼", example = "A001")
    private String liCode;

    @Schema(description = "里名稱", example = "信義里")
    private String name;

    @Schema(description = "行政區", example = "信義區")
    private String district;

    @Schema(description = "縣市", example = "台北市")
    private String city;

    @Schema(description = "狀態 (1=啟用 0=停用)", example = "1")
    private Integer status;

    public static NeighborhoodResponse from(Neighborhood n) {
        return NeighborhoodResponse.builder()
                .id(n.getId())
                .liCode(n.getLiCode())
                .name(n.getName())
                .district(n.getDistrict())
                .city(n.getCity())
                .status(n.getStatus())
                .build();
    }

    public static PageResult<NeighborhoodResponse> fromPage(PageResult<Neighborhood> page) {
        List<NeighborhoodResponse> records = page.getRecords().stream()
                .map(NeighborhoodResponse::from)
                .toList();
        return new PageResult<>(page.getTotal(), records);
    }
}
