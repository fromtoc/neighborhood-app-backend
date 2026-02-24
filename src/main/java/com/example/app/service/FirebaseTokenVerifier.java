package com.example.app.service;

import com.example.app.dto.firebase.FirebasePrincipal;

public interface FirebaseTokenVerifier {

    /**
     * Verifies the given Firebase ID token and returns the parsed principal.
     *
     * @param idToken raw Firebase ID token from the client
     * @return parsed principal (uid, provider, email, name, picture)
     * @throws com.example.app.common.exception.BusinessException (401) if the
     *         token is invalid or expired; (400) if the provider is unsupported
     */
    FirebasePrincipal verifyIdToken(String idToken);
}
