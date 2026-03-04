package com.example.app.service.impl;

import com.example.app.common.enums.SocialProvider;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.firebase.FirebasePrincipal;
import com.example.app.service.FirebaseTokenVerifier;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@Slf4j
@RequiredArgsConstructor
public class FirebaseTokenVerifierImpl implements FirebaseTokenVerifier {

    private final FirebaseAuth firebaseAuth;

    @Override
    @SuppressWarnings("unchecked")
    public FirebasePrincipal verifyIdToken(String idToken) {
        FirebaseToken token;
        try {
            token = firebaseAuth.verifyIdToken(idToken);
        } catch (FirebaseAuthException e) {
            log.debug("Firebase token verification failed: {}", e.getMessage());
            throw new BusinessException(ResultCode.UNAUTHORIZED,
                    "Invalid or expired Firebase ID token");
        }

        // The "firebase" claim contains sign_in_provider set by Firebase Auth
        Map<String, Object> firebaseClaims =
                (Map<String, Object>) token.getClaims().get("firebase");
        String signInProvider = firebaseClaims != null
                ? (String) firebaseClaims.get("sign_in_provider")
                : null;

        // Custom token sign-in: infer provider from uid prefix (e.g. "line:Uxxx")
        if ("custom".equals(signInProvider)) {
            String uid = token.getUid();
            if (uid.startsWith("line:")) signInProvider = "oidc.line";
        }

        SocialProvider provider = SocialProvider.fromFirebaseProvider(signInProvider);

        return FirebasePrincipal.builder()
                .uid(token.getUid())
                .provider(provider)
                .email(token.getEmail())
                .name(token.getName())
                .picture(token.getPicture())
                .build();
    }
}
