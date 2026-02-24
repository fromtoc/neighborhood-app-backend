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
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.RefreshRequest;
import com.example.app.entity.AuthSession;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.User;
import com.example.app.mapper.AuthSessionMapper;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.UserMapper;
import com.example.app.messaging.UserEventProducer;
import com.example.app.service.AuthService;
import com.example.app.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    private final NeighborhoodMapper neighborhoodMapper;
    private final UserMapper          userMapper;
    private final AuthSessionMapper   authSessionMapper;
    private final JwtService          jwtService;
    private final UserEventProducer   userEventProducer;

    // ── guest login ──────────────────────────────────────────

    @Override
    public AuthResponse guestLogin(GuestLoginRequest req) {
        // 1. Validate neighborhood
        Neighborhood hood = neighborhoodMapper.selectById(req.getNeighborhoodId());
        if (hood == null || !Objects.equals(hood.getStatus(), 1)) {
            throw new BusinessException(ResultCode.NOT_FOUND, "Neighborhood not found or inactive");
        }

        // 2. Create guest user
        User user = new User();
        user.setIsGuest(1);
        user.setDefaultNeighborhoodId(req.getNeighborhoodId());
        userMapper.insert(user); // MyBatis-Plus populates user.id via useGeneratedKeys

        // 3. Generate JWT pair
        TokenPair pair = jwtService.generateTokenPair(
                user.getId(), UserRole.GUEST, req.getNeighborhoodId());

        // 4. Persist refresh token hash (never store plaintext)
        saveSession(user.getId(), pair.getRefreshToken());

        // 5. Publish domain event — TX-safe (sent after commit via TransactionSynchronization)
        userEventProducer.publishGuestCreated(
                user.getId(), req.getNeighborhoodId(), req.getDeviceId(), Instant.now());

        return buildResponse(pair, user.getId(), true, req.getNeighborhoodId());
    }

    // ── refresh ──────────────────────────────────────────────

    @Override
    public AuthResponse refresh(RefreshRequest req) {
        // 1. Parse & validate token type
        JwtClaims claims = parseRefreshClaims(req.getRefreshToken());

        // 2. Look up session by hash + userId (prevents cross-user replay)
        String hash = hashToken(req.getRefreshToken());
        AuthSession session = authSessionMapper.selectOne(
                new LambdaQueryWrapper<AuthSession>()
                        .eq(AuthSession::getRefreshTokenHash, hash)
                        .eq(AuthSession::getUserId, claims.getUserId()));

        if (session == null || session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Session expired or not found");
        }

        // 3. Rotate: delete old session, issue new pair
        authSessionMapper.deleteById(session.getId());

        User user = userMapper.selectById(claims.getUserId());
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "User not found");
        }
        UserRole role = Objects.equals(user.getIsGuest(), 1) ? UserRole.GUEST : UserRole.USER;
        TokenPair pair = jwtService.generateTokenPair(
                user.getId(), role, user.getDefaultNeighborhoodId());
        saveSession(user.getId(), pair.getRefreshToken());

        return buildResponse(pair, user.getId(),
                Objects.equals(user.getIsGuest(), 1), user.getDefaultNeighborhoodId());
    }

    // ── logout ───────────────────────────────────────────────

    @Override
    public void logout(String accessToken, String refreshToken) {
        // Blacklist access token jti with remaining TTL
        if (accessToken != null) {
            try {
                JwtClaims claims = jwtService.parseToken(accessToken);
                jwtService.blacklistToken(claims.getJti(), claims.getExpiration());
            } catch (JwtAuthException e) {
                log.debug("Access token already invalid on logout, skipping blacklist");
            }
        }
        // Hard-delete session by refresh token hash
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
        return AuthResponse.builder()
                .accessToken(pair.getAccessToken())
                .refreshToken(pair.getRefreshToken())
                .accessExpiresIn(pair.getAccessExpiresIn())
                .user(AuthResponse.UserInfo.builder()
                        .id(userId)
                        .isGuest(isGuest)
                        .defaultNeighborhoodId(defaultNeighborhoodId)
                        .build())
                .build();
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
