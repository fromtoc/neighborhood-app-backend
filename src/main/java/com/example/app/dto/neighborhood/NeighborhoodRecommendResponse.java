package com.example.app.dto.neighborhood;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "鄰里推薦結果")
public class NeighborhoodRecommendResponse {

    @Schema(description = "鄰里 ID", example = "1")
    private Long id;

    @Schema(description = "里全名", example = "台北市信義區信義里")
    private String fullName;

    @Schema(description = "直線距離（公尺）", example = "342")
    private int distanceMeter;
}
