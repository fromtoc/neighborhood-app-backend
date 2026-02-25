package com.example.app.controller;

import com.example.app.common.ratelimit.RateLimiter;
import com.example.app.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Verifies that {@code AuthRateLimitAspect} enforces the 10 req/min cap
 * on POST /api/v1/auth/guest and POST /api/v1/auth/firebase.
 *
 * <p>{@link RateLimiter} is mocked so tests are deterministic without Redis.
 * {@link AuthService} is mocked so no DB/Firebase calls are made.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthRateLimitTest {

    private static final String GUEST_URL    = "/api/v1/auth/guest";
    private static final String FIREBASE_URL = "/api/v1/auth/firebase";

    private static final String GUEST_BODY =
            "{\"neighborhoodId\": 1}";
    private static final String GUEST_BODY_WITH_DEVICE =
            "{\"neighborhoodId\": 1, \"deviceId\": \"dev-abc\"}";
    private static final String FIREBASE_BODY =
            "{\"idToken\": \"tok\", \"neighborhoodId\": 1}";

    @Autowired MockMvc mockMvc;

    @MockBean AuthService    authService;
    @MockBean RateLimiter    rateLimiter;

    // ── guest: IP limit ───────────────────────────────────────────

    /**
     * Simulates 10 allowed requests followed by 1 blocked one.
     * The mock returns {@code true} for calls 1-10, {@code false} on the 11th.
     * Only the IP key is checked (no deviceId in request body).
     */
    @Test
    void guestLogin_ipLimit_11thCallReturns429() throws Exception {
        // 10 trues then 1 false — one isAllowed call per request (IP only, no deviceId)
        when(rateLimiter.isAllowed(startsWith("rate:auth:ip:"), eq(LIMIT), eq(WINDOW)))
                .thenReturn(true, true, true, true, true, true, true, true, true, true, false);

        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post(GUEST_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(GUEST_BODY))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post(GUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GUEST_BODY))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(429));
    }

    // ── guest: device limit ───────────────────────────────────────

    @Test
    void guestLogin_deviceLimit_returns429() throws Exception {
        when(rateLimiter.isAllowed(startsWith("rate:auth:ip:"),     eq(LIMIT), eq(WINDOW))).thenReturn(true);
        when(rateLimiter.isAllowed(startsWith("rate:auth:device:"), eq(LIMIT), eq(WINDOW))).thenReturn(false);

        mockMvc.perform(post(GUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GUEST_BODY_WITH_DEVICE))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(429));
    }

    // ── guest: device key skipped when deviceId absent ────────────

    @Test
    void guestLogin_noDeviceId_deviceKeyNotChecked() throws Exception {
        // Only the IP key is consulted; no deviceId in body
        when(rateLimiter.isAllowed(startsWith("rate:auth:ip:"), eq(LIMIT), eq(WINDOW))).thenReturn(true);

        mockMvc.perform(post(GUEST_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(GUEST_BODY))
                .andExpect(status().isOk());
    }

    // ── firebase: IP limit ────────────────────────────────────────

    @Test
    void firebaseLogin_ipLimit_11thCallReturns429() throws Exception {
        when(rateLimiter.isAllowed(startsWith("rate:auth:ip:"), eq(LIMIT), eq(WINDOW)))
                .thenReturn(true, true, true, true, true, true, true, true, true, true, false);

        for (int i = 0; i < 10; i++) {
            mockMvc.perform(post(FIREBASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(FIREBASE_BODY))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post(FIREBASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(FIREBASE_BODY))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(429));
    }

    // ── refresh and logout: NOT rate-limited ─────────────────────

    @Test
    void refresh_notRateLimited() throws Exception {
        // rateLimiter is never called for /refresh (aspect pointcut excludes it)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"t\"}"))
                .andExpect(status().isOk());
    }

    // ── constants matching the aspect ────────────────────────────

    private static final int LIMIT  = 10;
    private static final int WINDOW = 60;
}
