package com.example.app.dto.place;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreatePlaceRequest {

    @NotNull(message = "neighborhoodId 不得為空")
    private Long neighborhoodId;

    private Long categoryId;
    private String categoryName;

    @NotBlank(message = "店家名稱不得為空")
    private String name;

    private String description;
    private String address;
    private String phone;
    private String website;
    private String hours;
    private BigDecimal lat;
    private BigDecimal lng;
    private String coverImageUrl;
    private List<String> images;
    private List<String> tags;
    private Boolean hasHomeService;
    private Boolean isPartner;
}
