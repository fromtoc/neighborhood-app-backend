package com.example.app.service;

import com.example.app.common.enums.SocialProvider;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.dto.TokenPair;
import com.example.app.dto.auth.AuthResponse;
import com.example.app.dto.auth.FirebaseLoginRequest;
import com.example.app.dto.firebase.FirebasePrincipal;
import com.example.app.entity.AuthSession;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.User;
import com.example.app.entity.UserIdentity;
import com.example.app.mapper.AuthSessionMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserIdentityMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.messaging.UserEventProducer;
import com.example.app.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FirebaseAuthServiceTest {

    @Mock NeighborhoodMapper   neighborhoodMapper;
    @Mock UserMapper           userMapper;
    @Mock UserIdentityMapper   userIdentityMapper;
    @Mock AuthSessionMapper    authSessionMapper;
    @Mock JwtService           jwtService;
    @Mock UserEventProducer    userEventProducer;
    @Mock FirebaseTokenVerifier firebaseTokenVerifier;

    @InjectMocks AuthServiceImpl service;

    @BeforeEach
    void injectOptionalVerifier() {
        // firebaseTokenVerifier is @Autowired(required=false) — not in the constructor,
        // so @InjectMocks leaves it null after constructor injection. Set it manually.
        ReflectionTestUtils.setField(service, "firebaseTokenVerifier", firebaseTokenVerifier);
    }

    // ── existing identity → login ─────────────────────────────

    @Test
    void firebaseLogin_existingIdentity_updatesNgbAndPublishesLoginEvent() {
        // stub Firebase verification
        when(firebaseTokenVerifier.verifyIdToken("fb-token")).thenReturn(
                principal("uid-google-1", SocialProvider.GOOGLE));

        // stub neighborhood (active)
        when(neighborhoodMapper.selectById(10L)).thenReturn(neighborhood(10L, 1));

        // stub: identity already exists → login path
        UserIdentity existing = new UserIdentity();
        existing.setUserId(42L);
        existing.setProvider("GOOGLE");
        existing.setProviderUid("uid-google-1");
        when(userIdentityMapper.selectOne(any())).thenReturn(existing);

        // stub user fetch for resolveRole
        when(userMapper.selectById(42L)).thenReturn(normalUser(42L));

        // stub JWT generation
        when(jwtService.generateTokenPair(42L, UserRole.USER, 10L))
                .thenReturn(new TokenPair("acc", "ref", 900L));

        AuthResponse resp = service.firebaseLogin(request("fb-token", 10L, "device-1"));

        assertThat(resp.getAccessToken()).isEqualTo("acc");
        assertThat(resp.getUser().getIsGuest()).isFalse();
        assertThat(resp.getUser().getId()).isEqualTo(42L);
        assertThat(resp.getUser().getDefaultNeighborhoodId()).isEqualTo(10L);

        // defaultNeighborhoodId must be patched on the existing user
        verify(userMapper).updateById(argThat((User u) ->
                u.getId().equals(42L) && u.getDefaultNeighborhoodId().equals(10L)));

        // new user must NOT be created
        verify(userMapper, never()).insert(any(User.class));
        verify(userIdentityMapper, never()).insert(argThat((UserIdentity i) -> true));

        // session persisted with hashed refresh token
        verify(authSessionMapper).insert(argThat((AuthSession s) ->
                s.getUserId().equals(42L)
                        && s.getRefreshTokenHash() != null
                        && !s.getRefreshTokenHash().equals("ref")));

        // login event published (not registered)
        verify(userEventProducer).publishLogin(eq(42L), eq("GOOGLE"), eq("device-1"), any(Instant.class));
        verify(userEventProducer, never()).publishRegistered(any(), any(), any(), any());
    }

    // ── new identity → registration ───────────────────────────

    @Test
    void firebaseLogin_newIdentity_createsUserAndIdentityAndPublishesRegisteredEvent() {
        when(firebaseTokenVerifier.verifyIdToken("fb-token-new")).thenReturn(
                principal("uid-apple-2", SocialProvider.APPLE));

        when(neighborhoodMapper.selectById(20L)).thenReturn(neighborhood(20L, 1));

        // identity not found → registration path
        when(userIdentityMapper.selectOne(any())).thenReturn(null);

        // simulate MyBatis-Plus populating the generated ID
        doAnswer(inv -> {
            ((User) inv.getArgument(0)).setId(99L);
            return 1;
        }).when(userMapper).insert(argThat((User u) -> true));

        // stub user fetch for resolveRole (called after insert sets id=99)
        when(userMapper.selectById(99L)).thenReturn(normalUser(99L));

        when(jwtService.generateTokenPair(99L, UserRole.USER, 20L))
                .thenReturn(new TokenPair("new-acc", "new-ref", 900L));

        AuthResponse resp = service.firebaseLogin(request("fb-token-new", 20L, null));

        assertThat(resp.getAccessToken()).isEqualTo("new-acc");
        assertThat(resp.getUser().getIsGuest()).isFalse();
        assertThat(resp.getUser().getId()).isEqualTo(99L);

        // new user row must be created (is_guest=0)
        verify(userMapper).insert(argThat((User u) ->
                Objects.equals(u.getIsGuest(), 0)
                        && u.getDefaultNeighborhoodId().equals(20L)));

        // identity row must be created with correct provider + uid
        verify(userIdentityMapper).insert(argThat((UserIdentity id) ->
                id.getUserId().equals(99L)
                        && id.getProvider().equals("APPLE")
                        && id.getProviderUid().equals("uid-apple-2")));

        // updateById must NOT be called (no existing user to patch)
        verify(userMapper, never()).updateById(argThat((User u) -> true));

        // session persisted
        verify(authSessionMapper).insert(argThat((AuthSession s) ->
                s.getUserId().equals(99L) && s.getRefreshTokenHash() != null));

        // registered event published (not login)
        verify(userEventProducer).publishRegistered(eq(99L), eq("APPLE"), isNull(), any(Instant.class));
        verify(userEventProducer, never()).publishLogin(any(), any(), any(), any());
    }

    // ── guard: neighborhood not found ─────────────────────────

    @Test
    void firebaseLogin_neighborhoodNotFound_throws() {
        when(firebaseTokenVerifier.verifyIdToken("fb-token")).thenReturn(
                principal("uid-1", SocialProvider.GOOGLE));
        when(neighborhoodMapper.selectById(99L)).thenReturn(null);

        assertThatThrownBy(() -> service.firebaseLogin(request("fb-token", 99L, null)))
                .isInstanceOf(BusinessException.class);

        verifyNoInteractions(userMapper, userIdentityMapper, authSessionMapper);
    }

    // ── guard: Firebase not configured ────────────────────────

    @Test
    void firebaseLogin_verifierNotConfigured_throws500() {
        ReflectionTestUtils.setField(service, "firebaseTokenVerifier", null);

        assertThatThrownBy(() -> service.firebaseLogin(request("any", 1L, null)))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getCode()).isEqualTo(500));
    }

    // ── helpers ──────────────────────────────────────────────

    private FirebaseLoginRequest request(String idToken, Long neighborhoodId, String deviceId) {
        FirebaseLoginRequest req = new FirebaseLoginRequest();
        req.setIdToken(idToken);
        req.setNeighborhoodId(neighborhoodId);
        req.setDeviceId(deviceId);
        return req;
    }

    private FirebasePrincipal principal(String uid, SocialProvider provider) {
        return FirebasePrincipal.builder()
                .uid(uid)
                .provider(provider)
                .email("user@example.com")
                .name("Test User")
                .picture("https://pic.url")
                .build();
    }

    private Neighborhood neighborhood(Long id, int status) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setStatus(status);
        return n;
    }

    private com.example.app.entity.User normalUser(Long id) {
        com.example.app.entity.User u = new com.example.app.entity.User();
        u.setId(id);
        u.setIsGuest(0);
        u.setIsAdmin(0);
        u.setIsSuperAdmin(0);
        return u;
    }
}
