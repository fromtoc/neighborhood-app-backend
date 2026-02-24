package com.example.app.service;

import com.example.app.common.enums.TokenType;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.TokenPair;
import com.example.app.dto.auth.AuthResponse;
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.RefreshRequest;
import com.example.app.entity.AuthSession;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.User;
import com.example.app.mapper.AuthSessionMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.messaging.UserEventProducer;
import com.example.app.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock NeighborhoodMapper   neighborhoodMapper;
    @Mock UserMapper           userMapper;
    @Mock AuthSessionMapper    authSessionMapper;
    @Mock JwtService           jwtService;
    @Mock UserEventProducer    userEventProducer;

    @InjectMocks AuthServiceImpl service;

    // ── guestLogin ───────────────────────────────────────────

    @Test
    void guestLogin_success() {
        when(neighborhoodMapper.selectById(10L)).thenReturn(neighborhood(10L, 1));
        doAnswer(inv -> { ((User) inv.getArgument(0)).setId(1L); return 1; })
                .when(userMapper).insert(argThat((User u) -> true));
        when(jwtService.generateTokenPair(1L, UserRole.GUEST, 10L))
                .thenReturn(new TokenPair("acc", "ref", 900L));

        GuestLoginRequest req = new GuestLoginRequest();
        req.setNeighborhoodId(10L);
        req.setDeviceId("device-abc");

        AuthResponse resp = service.guestLogin(req);

        assertThat(resp.getAccessToken()).isEqualTo("acc");
        assertThat(resp.getUser().getIsGuest()).isTrue();
        assertThat(resp.getUser().getDefaultNeighborhoodId()).isEqualTo(10L);

        // session must be persisted with a non-null hash (never plaintext)
        verify(authSessionMapper).insert(argThat((AuthSession s) ->
                s.getUserId().equals(1L) && s.getRefreshTokenHash() != null
                        && !s.getRefreshTokenHash().equals("ref")));

        // domain event must be published via UserEventProducer
        verify(userEventProducer).publishGuestCreated(eq(1L), eq(10L), eq("device-abc"), any(Instant.class));
    }

    @Test
    void guestLogin_neighborhoodNotFound_throws() {
        when(neighborhoodMapper.selectById(99L)).thenReturn(null);

        GuestLoginRequest req = new GuestLoginRequest();
        req.setNeighborhoodId(99L);

        assertThatThrownBy(() -> service.guestLogin(req))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(userMapper);
    }

    @Test
    void guestLogin_neighborhoodInactive_throws() {
        when(neighborhoodMapper.selectById(5L)).thenReturn(neighborhood(5L, 0));

        GuestLoginRequest req = new GuestLoginRequest();
        req.setNeighborhoodId(5L);

        assertThatThrownBy(() -> service.guestLogin(req))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(userMapper);
    }

    // ── refresh ──────────────────────────────────────────────

    @Test
    void refresh_success_rotatesSession() {
        String oldRefresh = "old-refresh-token";
        JwtClaims refreshClaims = JwtClaims.builder()
                .userId(1L).tokenType(TokenType.REFRESH).jti("old-jti")
                .expiration(Date.from(Instant.now().plus(30, ChronoUnit.DAYS)))
                .build();
        when(jwtService.parseToken(oldRefresh)).thenReturn(refreshClaims);

        AuthSession session = new AuthSession();
        session.setId(100L);
        session.setUserId(1L);
        session.setRefreshTokenHash(AuthServiceImpl.hashToken(oldRefresh));
        session.setExpiresAt(LocalDateTime.now().plusDays(29));
        when(authSessionMapper.selectOne(any())).thenReturn(session);

        User user = new User();
        user.setId(1L);
        user.setIsGuest(1);
        user.setDefaultNeighborhoodId(10L);
        when(userMapper.selectById(1L)).thenReturn(user);
        when(jwtService.generateTokenPair(1L, UserRole.GUEST, 10L))
                .thenReturn(new TokenPair("new-acc", "new-ref", 900L));

        RefreshRequest req = new RefreshRequest();
        req.setRefreshToken(oldRefresh);
        AuthResponse resp = service.refresh(req);

        assertThat(resp.getAccessToken()).isEqualTo("new-acc");
        verify(authSessionMapper).deleteById(100L);         // old session deleted
        verify(authSessionMapper).insert(argThat((AuthSession s) ->       // new session saved
                s.getRefreshTokenHash() != null
                        && !s.getRefreshTokenHash().equals("new-ref")));
    }

    // ── logout ───────────────────────────────────────────────

    @Test
    void logout_blacklistsJtiAndDeletesSession() {
        JwtClaims claims = JwtClaims.builder()
                .userId(1L).tokenType(TokenType.ACCESS).jti("acc-jti")
                .expiration(Date.from(Instant.now().plus(15, ChronoUnit.MINUTES)))
                .build();
        when(jwtService.parseToken("access-token")).thenReturn(claims);

        service.logout("access-token", "refresh-token");

        verify(jwtService).blacklistToken(eq("acc-jti"), any(Date.class));
        verify(authSessionMapper).delete(any());
    }

    // ── helpers ──────────────────────────────────────────────

    private Neighborhood neighborhood(Long id, int status) {
        Neighborhood n = new Neighborhood();
        n.setId(id);
        n.setStatus(status);
        return n;
    }
}
