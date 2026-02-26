package com.example.app.controller;

import com.example.app.common.ratelimit.RateLimiter;
import com.example.app.service.LineOAuthClient;
import com.google.firebase.auth.FirebaseAuth;
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
 * Integration test for POST /api/v1/auth/line/custom-token.
 *
 * <p>{@link LineOAuthClient} and {@link FirebaseAuth} are mocked so that no real
 * LINE or Firebase network calls are made. The real {@link com.example.app.service.impl.LineCustomTokenServiceImpl}
 * runs, exercising the full controller → service stack.
 *
 * <p>{@link RateLimiter} is also mocked to allow all requests through.
 */
@SpringBootTest
@AutoConfigureMockMvc
class LineCustomTokenControllerTest {

    private static final String URL  = "/api/v1/auth/line/custom-token";
    private static final String BODY =
            "{\"code\":\"auth-code-123\",\"redirectUri\":\"https://example.com/cb\",\"codeVerifier\":\"pkce-verifier-abc\"}";

    @Autowired MockMvc mockMvc;

    @MockBean LineOAuthClient lineOAuthClient;
    @MockBean FirebaseAuth    firebaseAuth;
    @MockBean RateLimiter     rateLimiter;

    @Test
    void lineCustomToken_success_returnsFirebaseCustomToken() throws Exception {
        when(rateLimiter.isAllowed(any(), anyInt(), anyInt())).thenReturn(true);
        when(lineOAuthClient.fetchSub("auth-code-123", "https://example.com/cb", "pkce-verifier-abc"))
                .thenReturn("Uline1234567890");
        when(firebaseAuth.createCustomToken(eq("line:Uline1234567890"), any()))
                .thenReturn("firebase-custom-token-xyz");

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.firebaseCustomToken").value("firebase-custom-token-xyz"));
    }

    @Test
    void lineCustomToken_missingCode_returns422() throws Exception {
        when(rateLimiter.isAllowed(any(), anyInt(), anyInt())).thenReturn(true);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"redirectUri\":\"https://example.com/cb\",\"codeVerifier\":\"v\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value(422));
    }

    @Test
    void lineCustomToken_rateLimited_returns429() throws Exception {
        when(rateLimiter.isAllowed(startsWith("rate:auth:ip:"), anyInt(), anyInt())).thenReturn(false);

        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(429));
    }
}
