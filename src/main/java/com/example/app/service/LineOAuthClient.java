package com.example.app.service;

/**
 * Exchanges a LINE authorization code (PKCE) for the user's LINE {@code sub}.
 *
 * <p>The implementation is registered only when {@code line.channel-id} is configured.
 */
public interface LineOAuthClient {

    /**
     * Performs the two-step LINE OAuth exchange:
     * <ol>
     *   <li>POST to LINE token endpoint → exchange {@code code} for {@code id_token}</li>
     *   <li>POST to LINE verify endpoint → validate {@code id_token} and extract {@code sub}</li>
     * </ol>
     *
     * @return the LINE user identifier ({@code sub})
     */
    String fetchSub(String code, String redirectUri, String codeVerifier);
}
