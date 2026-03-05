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

    /**
     * Verifies a LINE {@code id_token} issued by the native SDK and extracts the {@code sub}.
     *
     * @param idToken the id_token from LINE SDK login result
     * @param nonce   the nonce returned by LINE SDK (may be null)
     * @return the LINE user identifier ({@code sub})
     */
    String fetchSubFromIdToken(String idToken, String nonce);
}
