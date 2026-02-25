package com.example.app.common.ratelimit;

/**
 * Sliding-window rate limiter contract.
 *
 * @return {@code true} if the request is within the allowed limit,
 *         {@code false} if it should be rejected.
 */
public interface RateLimiter {

    boolean isAllowed(String key, int limit, int windowSeconds);
}
