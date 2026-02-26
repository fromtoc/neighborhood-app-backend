package com.example.app.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LineCustomTokenRequest {

    @NotBlank
    private String code;

    @NotBlank
    private String redirectUri;

    @NotBlank
    private String codeVerifier;

    /** Optional — used for device-level rate limiting. */
    private String deviceId;
}
