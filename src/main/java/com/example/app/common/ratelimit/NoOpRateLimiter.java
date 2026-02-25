package com.example.app.common.ratelimit;

/**
 * Fallback rate limiter used when Redis is not available (e.g. test environment).
 * Always allows every request — no limiting is applied.
 *
 * <p>Registered as a bean by {@link com.example.app.config.RateLimiterConfig}
 * when no other {@code RateLimiter} bean exists.
 */
public class NoOpRateLimiter implements RateLimiter {

    @Override
    public boolean isAllowed(String key, int limit, int windowSeconds) {
        return true;
    }
}
