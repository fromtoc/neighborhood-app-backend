package com.example.app.common.aspect;

import com.example.app.common.exception.RateLimitException;
import com.example.app.common.ratelimit.RateLimiter;
import com.example.app.dto.auth.FirebaseLoginRequest;
import com.example.app.dto.auth.GuestLoginRequest;
import com.example.app.dto.auth.LineCustomTokenRequest;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Rate-limits POST /api/v1/auth/guest and POST /api/v1/auth/firebase.
 *
 * <p>Two keys are checked per request:
 * <ul>
 *   <li>{@code rate:auth:ip:{ip}} — max 10 req/min per client IP</li>
 *   <li>{@code rate:auth:device:{deviceId}} — max 10 req/min per device (when present)</li>
 * </ul>
 * Either limit exceeded throws {@link RateLimitException} → HTTP 429.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuthRateLimitAspect {

    private static final int LIMIT          = 10;
    private static final int WINDOW_SECONDS = 60;

    private final RateLimiter rateLimiter;

    @Around("execution(* com.example.app.controller.AuthController.guestLogin(..)) || " +
            "execution(* com.example.app.controller.AuthController.firebaseLogin(..)) || " +
            "execution(* com.example.app.controller.AuthController.lineCustomToken(..))")
    public Object rateLimit(ProceedingJoinPoint pjp) throws Throwable {
        HttpServletRequest request = currentRequest();
        String ip = extractIp(request);

        if (!rateLimiter.isAllowed("rate:auth:ip:" + ip, LIMIT, WINDOW_SECONDS)) {
            log.warn("Rate limit exceeded for IP: {}", ip);
            throw new RateLimitException("Too many requests — please try again later");
        }

        String deviceId = extractDeviceId(pjp.getArgs());
        if (StringUtils.hasText(deviceId)
                && !rateLimiter.isAllowed("rate:auth:device:" + deviceId, LIMIT, WINDOW_SECONDS)) {
            log.warn("Rate limit exceeded for device: {}", deviceId);
            throw new RateLimitException("Too many requests — please try again later");
        }

        return pjp.proceed();
    }

    // ── helpers ──────────────────────────────────────────────────

    private static HttpServletRequest currentRequest() {
        return ((ServletRequestAttributes)
                RequestContextHolder.currentRequestAttributes()).getRequest();
    }

    private static String extractIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String extractDeviceId(Object[] args) {
        for (Object arg : args) {
            if (arg instanceof GuestLoginRequest r)       return r.getDeviceId();
            if (arg instanceof FirebaseLoginRequest r)    return r.getDeviceId();
            if (arg instanceof LineCustomTokenRequest r)  return r.getDeviceId();
        }
        return null;
    }
}
