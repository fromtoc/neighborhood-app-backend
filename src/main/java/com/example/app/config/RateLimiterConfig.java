package com.example.app.config;

import com.example.app.common.ratelimit.NoOpRateLimiter;
import com.example.app.common.ratelimit.RateLimiter;
import com.example.app.common.ratelimit.RedisRateLimiter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;

/**
 * Registers exactly one {@link RateLimiter} bean.
 *
 * <ul>
 *   <li>When Redis is present → {@link RedisRateLimiter} (enforces limits)</li>
 *   <li>Otherwise → {@link NoOpRateLimiter} (allows all — e.g. test environment)</li>
 * </ul>
 *
 * <p>Declaring both beans inside a {@code @Configuration} class guarantees that
 * {@code @ConditionalOnMissingBean} is evaluated after the conditional Redis bean,
 * which is not the case when using {@code @Component} scanning.
 */
@Configuration
public class RateLimiterConfig {

    @Bean
    @ConditionalOnBean(RedisConnectionFactory.class)
    public RateLimiter redisRateLimiter(RedisTemplate<String, Object> redisTemplate) {
        return new RedisRateLimiter(redisTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(RateLimiter.class)
    public RateLimiter noOpRateLimiter() {
        return new NoOpRateLimiter();
    }
}
