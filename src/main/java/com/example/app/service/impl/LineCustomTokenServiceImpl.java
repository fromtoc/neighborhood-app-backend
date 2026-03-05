package com.example.app.service.impl;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.auth.LineCustomTokenRequest;
import com.example.app.dto.auth.LineIdTokenRequest;
import com.example.app.service.LineCustomTokenService;
import com.example.app.service.LineOAuthClient;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Orchestrates the LINE → Firebase custom-token flow:
 * <ol>
 *   <li>Delegates to {@link LineOAuthClient} to exchange the authorization code for a LINE {@code sub}</li>
 *   <li>Calls {@code FirebaseAuth.createCustomToken} with uid {@code "line:{sub}"}</li>
 * </ol>
 *
 * <p>Both dependencies are optional (@Autowired required=false); the method guards for null
 * and throws HTTP 500 when either is not configured — the same pattern as
 * {@code AuthServiceImpl.firebaseLogin()}.
 */
@Slf4j
@Service
public class LineCustomTokenServiceImpl implements LineCustomTokenService {

    @Autowired(required = false)
    private LineOAuthClient lineOAuthClient;

    @Autowired(required = false)
    private FirebaseAuth firebaseAuth;

    @Override
    public String createCustomToken(LineCustomTokenRequest req) {
        if (lineOAuthClient == null) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "LINE OAuth is not configured (set LINE_CHANNEL_ID + LINE_CHANNEL_SECRET)");
        }
        if (firebaseAuth == null) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "Firebase is not configured (set FIREBASE_CREDENTIALS_PATH)");
        }

        String sub = lineOAuthClient.fetchSub(req.getCode(), req.getRedirectUri(), req.getCodeVerifier());
        String uid = "line:" + sub;

        Map<String, Object> claims = Map.of(
                "provider",    "LINE",
                "providerUid", sub
        );

        try {
            String customToken = firebaseAuth.createCustomToken(uid, claims);
            log.debug("LINE custom token created: uid={}", uid);
            return customToken;
        } catch (FirebaseAuthException e) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "Failed to create Firebase custom token: " + e.getMessage());
        }
    }

    @Override
    public String createCustomTokenFromIdToken(LineIdTokenRequest req) {
        if (lineOAuthClient == null) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "LINE OAuth is not configured (set LINE_CHANNEL_ID + LINE_CHANNEL_SECRET)");
        }
        if (firebaseAuth == null) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "Firebase is not configured (set FIREBASE_CREDENTIALS_PATH)");
        }

        String sub = lineOAuthClient.fetchSubFromIdToken(req.getIdToken(), req.getNonce());
        String uid = "line:" + sub;

        Map<String, Object> claims = Map.of(
                "provider",    "LINE",
                "providerUid", sub
        );

        try {
            String customToken = firebaseAuth.createCustomToken(uid, claims);
            log.debug("LINE custom token created from id_token: uid={}", uid);
            return customToken;
        } catch (FirebaseAuthException e) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "Failed to create Firebase custom token: " + e.getMessage());
        }
    }
}
