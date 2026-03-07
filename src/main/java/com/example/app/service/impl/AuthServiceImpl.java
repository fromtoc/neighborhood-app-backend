package com.example.app.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.enums.TokenType;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.exception.JwtAuthException;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.TokenPair;
import com.example.app.dto.auth.AuthResponse;
import com.example.app.dto.auth.FirebaseLoginRequest;
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.RefreshRequest;
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
import com.example.app.service.AuthService;
import com.example.app.service.FirebaseTokenVerifier;
import com.example.app.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Objects;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final NeighborhoodMapper  neighborhoodMapper;
    private final UserMapper           userMapper;
    private final UserIdentityMapper   userIdentityMapper;
    private final AuthSessionMapper    authSessionMapper;
    private final JwtService           jwtService;
    private final UserEventProducer    userEventProducer;

    /** Optional — present only when Firebase Admin SDK is configured. */
    @Autowired(required = false)
    private FirebaseTokenVerifier firebaseTokenVerifier;

    // ── guest login ──────────────────────────────────────────

    @Override
    public AuthResponse guestLogin(GuestLoginRequest req) {
        Neighborhood hood = neighborhoodMapper.selectById(req.getNeighborhoodId());
        if (hood == null || !Objects.equals(hood.getStatus(), 1)) {
            throw new BusinessException(ResultCode.NOT_FOUND, "Neighborhood not found or inactive");
        }

        User user = new User();
        user.setIsGuest(1);
        user.setDefaultNeighborhoodId(req.getNeighborhoodId());
        userMapper.insert(user);

        TokenPair pair = jwtService.generateTokenPair(
                user.getId(), UserRole.GUEST, req.getNeighborhoodId());
        saveSession(user.getId(), pair.getRefreshToken());

        userEventProducer.publishGuestCreated(
                user.getId(), req.getNeighborhoodId(), req.getDeviceId(), Instant.now());

        return buildResponse(pair, user.getId(), true, req.getNeighborhoodId());
    }

    // ── Firebase login ────────────────────────────────────────

    @Override
    public AuthResponse firebaseLogin(FirebaseLoginRequest req) {
        if (firebaseTokenVerifier == null) {
            throw new BusinessException(ResultCode.INTERNAL_ERROR,
                    "Firebase authentication is not configured on this server");
        }

        // 1. Verify Firebase ID token
        FirebasePrincipal principal = firebaseTokenVerifier.verifyIdToken(req.getIdToken());

        // 2. Validate neighborhood
        Neighborhood hood = neighborhoodMapper.selectById(req.getNeighborhoodId());
        if (hood == null || !Objects.equals(hood.getStatus(), 1)) {
            throw new BusinessException(ResultCode.NOT_FOUND, "Neighborhood not found or inactive");
        }

        // 3. Look up identity by (provider, providerUid)
        String providerName = principal.getProvider().name();   // e.g. "GOOGLE"
        UserIdentity identity = userIdentityMapper.selectOne(
                new LambdaQueryWrapper<UserIdentity>()
                        .eq(UserIdentity::getProvider, providerName)
                        .eq(UserIdentity::getProviderUid, principal.getUid()));

        final Long userId;
        final boolean isNewUser;

        if (identity != null) {
            // 4a. Existing user — login path
            userId = identity.getUserId();

            // Keep defaultNeighborhoodId in sync with the request
            User patch = new User();
            patch.setId(userId);
            patch.setDefaultNeighborhoodId(req.getNeighborhoodId());
            userMapper.updateById(patch);

            isNewUser = false;
            log.debug("Firebase login: existing userId={} provider={}", userId, providerName);
        } else {
            // 4b. New user — registration path
            User user = new User();
            user.setIsGuest(0);
            user.setNickname(principal.getName());
            user.setAvatarUrl(principal.getPicture());
            user.setDefaultNeighborhoodId(req.getNeighborhoodId());
            userMapper.insert(user);
            userId = user.getId();

            UserIdentity newIdentity = new UserIdentity();
            newIdentity.setUserId(userId);
            newIdentity.setProvider(providerName);
            newIdentity.setProviderUid(principal.getUid());
            userIdentityMapper.insert(newIdentity);

            isNewUser = true;
            log.debug("Firebase register: new userId={} provider={}", userId, providerName);
        }

        // 5. Issue tokens & persist session
        User userForRole = userMapper.selectById(userId);
        UserRole role = resolveRole(userForRole);
        TokenPair pair = jwtService.generateTokenPair(userId, role, req.getNeighborhoodId());
        saveSession(userId, pair.getRefreshToken());

        // 6. Publish domain event (TX-safe: sent after commit)
        if (isNewUser) {
            userEventProducer.publishRegistered(
                    userId, providerName, req.getDeviceId(), Instant.now());
        } else {
            userEventProducer.publishLogin(
                    userId, providerName, req.getDeviceId(), Instant.now());
        }

        return buildResponse(pair, userId, false, req.getNeighborhoodId());
    }

    // ── refresh ──────────────────────────────────────────────

    @Override
    public AuthResponse refresh(RefreshRequest req) {
        JwtClaims claims = parseRefreshClaims(req.getRefreshToken());

        String hash = hashToken(req.getRefreshToken());
        AuthSession session = authSessionMapper.selectOne(
                new LambdaQueryWrapper<AuthSession>()
                        .eq(AuthSession::getRefreshTokenHash, hash)
                        .eq(AuthSession::getUserId, claims.getUserId()));

        if (session == null || session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Session expired or not found");
        }

        authSessionMapper.deleteById(session.getId());

        User user = userMapper.selectById(claims.getUserId());
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "User not found");
        }
        UserRole role = resolveRole(user);
        TokenPair pair = jwtService.generateTokenPair(
                user.getId(), role, user.getDefaultNeighborhoodId());
        saveSession(user.getId(), pair.getRefreshToken());

        return buildResponse(pair, user.getId(),
                Objects.equals(user.getIsGuest(), 1), user.getDefaultNeighborhoodId());
    }

    // ── logout ───────────────────────────────────────────────

    @Override
    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null) {
            try {
                JwtClaims claims = jwtService.parseToken(accessToken);
                jwtService.blacklistToken(claims.getJti(), claims.getExpiration());
            } catch (JwtAuthException e) {
                log.debug("Access token already invalid on logout, skipping blacklist");
            }
        }
        if (refreshToken != null) {
            authSessionMapper.delete(
                    new LambdaQueryWrapper<AuthSession>()
                            .eq(AuthSession::getRefreshTokenHash, hashToken(refreshToken)));
        }
    }

    // ── helpers ──────────────────────────────────────────────

    private JwtClaims parseRefreshClaims(String token) {
        try {
            JwtClaims claims = jwtService.parseToken(token);
            if (claims.getTokenType() != TokenType.REFRESH) {
                throw new BusinessException(ResultCode.BAD_REQUEST, "Not a refresh token");
            }
            return claims;
        } catch (JwtAuthException e) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Invalid refresh token");
        }
    }

    private void saveSession(Long userId, String refreshToken) {
        AuthSession session = new AuthSession();
        session.setUserId(userId);
        session.setRefreshTokenHash(hashToken(refreshToken));
        session.setExpiresAt(LocalDateTime.now().plusDays(30));
        authSessionMapper.insert(session);
    }

    private AuthResponse buildResponse(TokenPair pair, Long userId,
                                        boolean isGuest, Long defaultNeighborhoodId) {
        User u = userMapper.selectById(userId);
        String nickname = (u != null) ? u.getNickname() : null;
        return AuthResponse.builder()
                .accessToken(pair.getAccessToken())
                .refreshToken(pair.getRefreshToken())
                .accessExpiresIn(pair.getAccessExpiresIn())
                .user(AuthResponse.UserInfo.builder()
                        .id(userId)
                        .isGuest(isGuest)
                        .nickname(nickname)
                        .defaultNeighborhoodId(defaultNeighborhoodId)
                        .build())
                .build();
    }

    private static UserRole resolveRole(User user) {
        if (user == null) return UserRole.GUEST;
        if (Integer.valueOf(1).equals(user.getIsGuest()))      return UserRole.GUEST;
        if (Integer.valueOf(1).equals(user.getIsSuperAdmin())) return UserRole.SUPER_ADMIN;
        if (Integer.valueOf(1).equals(user.getIsAdmin()))      return UserRole.ADMIN;
        return UserRole.USER;
    }

    /** SHA-256 hex of the token. */
    public static String hashToken(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
