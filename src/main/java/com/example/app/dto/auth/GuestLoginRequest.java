package com.example.app.dto.auth;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GuestLoginRequest {

    @NotNull(message = "neighborhoodId is required")
    private Long neighborhoodId;

    private String deviceId;
}
