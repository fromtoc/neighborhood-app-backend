package com.example.app.controller;

import com.example.app.common.result.ApiResponse;
import com.example.app.dto.auth.AuthResponse;
import com.example.app.dto.auth.FirebaseLoginRequest;
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.LogoutRequest;
import com.example.app.dto.auth.RefreshRequest;
import com.example.app.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/guest")
    public ApiResponse<AuthResponse> guestLogin(@Valid @RequestBody GuestLoginRequest req) {
        return ApiResponse.success(authService.guestLogin(req));
    }

    @PostMapping("/firebase")
    public ApiResponse<AuthResponse> firebaseLogin(@Valid @RequestBody FirebaseLoginRequest req) {
        return ApiResponse.success(authService.firebaseLogin(req));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return ApiResponse.success(authService.refresh(req));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @RequestBody(required = false) LogoutRequest req) {
        String accessToken = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7) : null;
        authService.logout(accessToken, req != null ? req.getRefreshToken() : null);
        return ApiResponse.success();
    }
}
