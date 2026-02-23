package com.example.app.service;

import com.example.app.common.enums.TokenType;
import com.example.app.common.enums.UserRole;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.TokenPair;
import com.example.app.service.impl.JwtServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {

    // 48-char base64 → 36 bytes (288 bits) — satisfies HS256 minimum of 256 bits
    private static final String TEST_SECRET =
            "bXktc3VwZXItc2VjcmV0LWtleS1mb3ItbmVpZ2hib3Job29k";

    @Mock
    RedisTemplate<String, Object> redisTemplate;

    private JwtServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new JwtServiceImpl();
        ReflectionTestUtils.setField(service, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(service, "accessTokenExpiryMs", 900_000L);
        ReflectionTestUtils.setField(service, "refreshTokenExpiryMs", 2_592_000_000L);
        ReflectionTestUtils.setField(service, "redisTemplate", redisTemplate);
        ReflectionTestUtils.invokeMethod(service, "init");
    }

    @Test
    void generateTokenPair_parsesCorrectClaims() {
        TokenPair pair = service.generateTokenPair(1L, UserRole.USER, 42L);

        assertThat(pair.getAccessToken()).isNotBlank();
        assertThat(pair.getRefreshToken()).isNotBlank();
        assertThat(pair.getAccessExpiresIn()).isEqualTo(900L);

        JwtClaims claims = service.parseToken(pair.getAccessToken());
        assertThat(claims.getUserId()).isEqualTo(1L);
        assertThat(claims.getRole()).isEqualTo(UserRole.USER);
        assertThat(claims.getDefaultNeighborhoodId()).isEqualTo(42L);
        assertThat(claims.getTokenType()).isEqualTo(TokenType.ACCESS);
        assertThat(claims.getJti()).isNotBlank();

        // Refresh token must have a different jti
        JwtClaims refreshClaims = service.parseToken(pair.getRefreshToken());
        assertThat(refreshClaims.getTokenType()).isEqualTo(TokenType.REFRESH);
        assertThat(refreshClaims.getJti()).isNotEqualTo(claims.getJti());
    }

    @Test
    void isBlacklisted_returnsTrueWhenKeyExistsInRedis() {
        when(redisTemplate.hasKey(startsWith("auth:blacklist:jti:"))).thenReturn(true);

        assertThat(service.isBlacklisted("some-jti")).isTrue();
    }
}
