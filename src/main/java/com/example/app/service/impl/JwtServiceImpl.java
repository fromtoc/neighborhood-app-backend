package com.example.app.service.impl;

import com.example.app.common.cache.CacheKeys;
import com.example.app.common.enums.TokenType;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.JwtAuthException;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.TokenPair;
import com.example.app.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Service
public class JwtServiceImpl implements JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.access-token-expiry-ms:900000}")
    private long accessTokenExpiryMs;

    @Value("${app.jwt.refresh-token-expiry-ms:2592000000}")
    private long refreshTokenExpiryMs;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    private SecretKey secretKey;

    @PostConstruct
    void init() {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    @Override
    public TokenPair generateTokenPair(Long userId, UserRole role, Long defaultNeighborhoodId) {
        Date now = new Date();
        String accessToken = buildToken(userId, role, defaultNeighborhoodId, TokenType.ACCESS,
                now, new Date(now.getTime() + accessTokenExpiryMs));
        String refreshToken = buildToken(userId, role, defaultNeighborhoodId, TokenType.REFRESH,
                now, new Date(now.getTime() + refreshTokenExpiryMs));
        return new TokenPair(accessToken, refreshToken, accessTokenExpiryMs / 1000);
    }

    @Override
    public JwtClaims parseToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Object ngbRaw = claims.get("ngb");
            Long ngb = ngbRaw == null ? null : ((Number) ngbRaw).longValue();

            return JwtClaims.builder()
                    .userId(Long.parseLong(claims.getSubject()))
                    .role(UserRole.valueOf(claims.get("role", String.class)))
                    .defaultNeighborhoodId(ngb)
                    .jti(claims.getId())
                    .tokenType(TokenType.valueOf(claims.get("type", String.class)))
                    .issuedAt(claims.getIssuedAt())
                    .expiration(claims.getExpiration())
                    .build();
        } catch (JwtException | IllegalArgumentException e) {
            throw new JwtAuthException("Invalid JWT: " + e.getMessage(), e);
        }
    }

    @Override
    public void blacklistToken(String jti, Date expiration) {
        if (redisTemplate == null) return;
        long ttlSeconds = (expiration.getTime() - System.currentTimeMillis()) / 1000;
        if (ttlSeconds > 0) {
            redisTemplate.opsForValue().set(CacheKeys.jwtBlacklist(jti), "1",
                    Duration.ofSeconds(ttlSeconds));
        }
    }

    @Override
    public boolean isBlacklisted(String jti) {
        if (redisTemplate == null) return false;
        return Boolean.TRUE.equals(redisTemplate.hasKey(CacheKeys.jwtBlacklist(jti)));
    }

    private String buildToken(Long userId, UserRole role, Long ngb,
                               TokenType type, Date iat, Date exp) {
        JwtBuilder builder = Jwts.builder()
                .subject(userId.toString())
                .claim("role", role.name())
                .claim("type", type.name())
                .id(UUID.randomUUID().toString())
                .issuedAt(iat)
                .expiration(exp)
                .signWith(secretKey);
        if (ngb != null) {
            builder.claim("ngb", ngb);
        }
        return builder.compact();
    }
}
