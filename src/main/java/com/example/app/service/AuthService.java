package com.example.app.service;

import com.example.app.dto.auth.AuthResponse;
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.RefreshRequest;

public interface AuthService {

    AuthResponse guestLogin(GuestLoginRequest req);

    AuthResponse refresh(RefreshRequest req);

    /** Revoke session and blacklist access token jti. Both params are optional. */
    void logout(String accessToken, String refreshToken);
}
