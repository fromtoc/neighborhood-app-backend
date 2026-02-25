package com.example.app.common.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;

import java.time.Duration;

/**
 * Redis-backed fixed-window rate limiter.
 *
 * <p>Uses {@code INCR} to count requests per window. On the first request in a window
 * (count == 1), sets the key TTL so the window expires automatically.
 *
 * <p>Registered as a bean by {@link com.example.app.config.RateLimiterConfig}
 * only when a {@code RedisConnectionFactory} is present.
 */
@RequiredArgsConstructor
public class RedisRateLimiter implements RateLimiter {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public boolean isAllowed(String key, int limit, int windowSeconds) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count == null) return true;            // Redis error — fail open
        if (count == 1L) {
            // First hit in this window — set the expiry
            redisTemplate.expire(key, Duration.ofSeconds(windowSeconds));
        }
        return count <= limit;
    }
}
