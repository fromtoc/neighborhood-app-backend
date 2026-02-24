package com.example.app.service;

import com.example.app.common.enums.SocialProvider;
import com.example.app.common.exception.BusinessException;
import com.example.app.dto.firebase.FirebasePrincipal;
import com.example.app.service.impl.FirebaseTokenVerifierImpl;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link FirebaseTokenVerifierImpl}.
 * {@link FirebaseAuth} and {@link FirebaseToken} are mocked via Mockito 5.x
 * inline mock maker, which handles classes with private / package-private
 * constructors without requiring any extra configuration.
 */
@ExtendWith(MockitoExtension.class)
class FirebaseTokenVerifierTest {

    @Mock FirebaseAuth firebaseAuth;

    FirebaseTokenVerifierImpl verifier;

    @BeforeEach
    void setUp() {
        verifier = new FirebaseTokenVerifierImpl(firebaseAuth);
    }

    // ── happy path ────────────────────────────────────────────

    @Test
    void verifyIdToken_validGoogleToken_returnsPrincipal() throws FirebaseAuthException {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("uid-google-123");
        when(token.getEmail()).thenReturn("user@gmail.com");
        when(token.getName()).thenReturn("Test User");
        when(token.getPicture()).thenReturn("https://photo.url/photo.jpg");
        when(token.getClaims()).thenReturn(
                Map.of("firebase", Map.of("sign_in_provider", "google.com")));
        when(firebaseAuth.verifyIdToken("google-id-token")).thenReturn(token);

        FirebasePrincipal principal = verifier.verifyIdToken("google-id-token");

        assertThat(principal.getUid()).isEqualTo("uid-google-123");
        assertThat(principal.getProvider()).isEqualTo(SocialProvider.GOOGLE);
        assertThat(principal.getEmail()).isEqualTo("user@gmail.com");
        assertThat(principal.getName()).isEqualTo("Test User");
        assertThat(principal.getPicture()).isEqualTo("https://photo.url/photo.jpg");
    }

    @Test
    void verifyIdToken_validAppleToken_mapsProvider() throws FirebaseAuthException {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("uid-apple-456");
        when(token.getEmail()).thenReturn(null);   // Apple can hide the email
        when(token.getName()).thenReturn(null);
        when(token.getPicture()).thenReturn(null);
        when(token.getClaims()).thenReturn(
                Map.of("firebase", Map.of("sign_in_provider", "apple.com")));
        when(firebaseAuth.verifyIdToken("apple-id-token")).thenReturn(token);

        FirebasePrincipal principal = verifier.verifyIdToken("apple-id-token");

        assertThat(principal.getProvider()).isEqualTo(SocialProvider.APPLE);
        assertThat(principal.getUid()).isEqualTo("uid-apple-456");
        assertThat(principal.getEmail()).isNull();
    }

    // ── error cases ───────────────────────────────────────────

    @Test
    void verifyIdToken_expiredToken_throwsUnauthorizedBusinessException()
            throws FirebaseAuthException {
        when(firebaseAuth.verifyIdToken("expired-token"))
                .thenThrow(mock(FirebaseAuthException.class));

        assertThatThrownBy(() -> verifier.verifyIdToken("expired-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(401));
    }

    @Test
    void verifyIdToken_unsupportedProvider_throwsBadRequestBusinessException()
            throws FirebaseAuthException {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getClaims()).thenReturn(
                Map.of("firebase", Map.of("sign_in_provider", "twitter.com")));
        when(firebaseAuth.verifyIdToken("twitter-token")).thenReturn(token);

        assertThatThrownBy(() -> verifier.verifyIdToken("twitter-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(400));
    }

    @Test
    void verifyIdToken_missingFirebaseClaim_throwsBadRequestBusinessException()
            throws FirebaseAuthException {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getClaims()).thenReturn(Map.of()); // no "firebase" claim
        when(firebaseAuth.verifyIdToken("no-claim-token")).thenReturn(token);

        assertThatThrownBy(() -> verifier.verifyIdToken("no-claim-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo(400));
    }
}
