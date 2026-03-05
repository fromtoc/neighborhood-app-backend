package com.example.app.service.impl;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.config.LineProperties;
import com.example.app.service.LineOAuthClient;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Calls the LINE OAuth 2.1 endpoints to exchange an authorization code for a user {@code sub}.
 *
 * <p>Active only when {@code line.channel-id} property is present.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "line.channel-id")
public class LineOAuthClientImpl implements LineOAuthClient {

    private final LineProperties props;
    private final RestClient restClient;

    public LineOAuthClientImpl(LineProperties props, RestClient.Builder builder) {
        this.props = props;
        this.restClient = builder.build();
    }

    @Override
    public String fetchSub(String code, String redirectUri, String codeVerifier) {
        String idToken = exchangeCodeForIdToken(code, redirectUri, codeVerifier);
        return verifyIdToken(idToken, null);
    }

    @Override
    public String fetchSubFromIdToken(String idToken, String nonce) {
        return verifyIdToken(idToken, nonce);
    }

    // ── step 1: code → id_token ───────────────────────────────────

    private String exchangeCodeForIdToken(String code, String redirectUri, String codeVerifier) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type",    "authorization_code");
        params.add("code",          code);
        params.add("redirect_uri",  redirectUri);
        params.add("client_id",     props.getChannelId());
        params.add("client_secret", props.getChannelSecret());
        params.add("code_verifier", codeVerifier);

        log.debug("LINE token exchange: redirect_uri={}", redirectUri);

        LineTokenResponse resp = restClient.post()
                .uri(props.getTokenEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(params)
                .retrieve()
                .onStatus(status -> status.isError(), (req, res) -> {
                    String body = new String(res.getBody().readAllBytes());
                    log.warn("LINE token exchange failed: status={} body={}", res.getStatusCode(), body);
                    throw new BusinessException(ResultCode.BAD_REQUEST,
                            "LINE token exchange failed: " + body);
                })
                .body(LineTokenResponse.class);

        if (resp == null || resp.getIdToken() == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST,
                    "LINE token response did not contain id_token");
        }
        return resp.getIdToken();
    }

    // ── step 2: id_token → sub ────────────────────────────────────

    private String verifyIdToken(String idToken, String nonce) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("id_token",  idToken);
        params.add("client_id", props.getChannelId());
        if (nonce != null) params.add("nonce", nonce);

        LineVerifyResponse resp = restClient.post()
                .uri(props.getVerifyEndpoint())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(params)
                .retrieve()
                .onStatus(status -> status.isError(), (req, res) -> {
                    throw new BusinessException(ResultCode.BAD_REQUEST,
                            "LINE id_token verification failed (HTTP " + res.getStatusCode() + ")");
                })
                .body(LineVerifyResponse.class);

        if (resp == null || resp.getSub() == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST,
                    "LINE verify response did not contain sub");
        }
        log.debug("LINE verify: sub={}", resp.getSub());
        return resp.getSub();
    }

    // ── internal LINE API response DTOs ──────────────────────────

    @Data
    private static class LineTokenResponse {
        @JsonProperty("id_token")
        private String idToken;
        @JsonProperty("access_token")
        private String accessToken;
    }

    @Data
    private static class LineVerifyResponse {
        private String sub;
        private String name;
        private String picture;
    }
}
