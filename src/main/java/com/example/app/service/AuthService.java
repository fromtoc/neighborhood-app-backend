package com.example.app.service;

import com.example.app.dto.auth.AuthResponse;
import com.example.app.dto.auth.FirebaseLoginRequest;
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.RefreshRequest;

public interface AuthService {

    AuthResponse guestLogin(GuestLoginRequest req);

    /**
     * Verify a Firebase ID token, look up or create the associated user, and
     * return a JWT token pair.  Publishes {@code user.login} or
     * {@code user.registered} after transaction commit.
     */
    AuthResponse firebaseLogin(FirebaseLoginRequest req);

    AuthResponse refresh(RefreshRequest req);

    /** Revoke session and blacklist access token jti. Both params are optional. */
    void logout(String accessToken, String refreshToken);
}
