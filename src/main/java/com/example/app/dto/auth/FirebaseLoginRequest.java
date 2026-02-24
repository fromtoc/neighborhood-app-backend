package com.example.app.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FirebaseLoginRequest {

    @NotBlank
    private String idToken;

    @NotNull
    private Long neighborhoodId;

    private String deviceId;   // optional
}
