package com.example.app.service;

import com.example.app.dto.auth.LineCustomTokenRequest;

public interface LineCustomTokenService {

    /**
     * Exchanges a LINE auth code for a Firebase custom token.
     *
     * @return Firebase custom token to pass to {@code signInWithCustomToken} on the client
     */
    String createCustomToken(LineCustomTokenRequest req);
}
