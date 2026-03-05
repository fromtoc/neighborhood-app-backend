package com.example.app.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LineIdTokenRequest {

    @NotBlank
    private String idToken;

    /** Nonce returned by LINE SDK — used to prevent replay attacks. */
    private String nonce;

    /** Optional — used for device-level rate limiting. */
    private String deviceId;
}
