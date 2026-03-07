package com.example.app.common.filter;

import com.example.app.config.AdminProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

/**
 * Admin API 保護 Filter。
 *
 * <p>僅攔截 {@code /api/v1/admin/**} 路徑。
 * <ul>
 *   <li>{@code app.admin.token} 未設定（空字串）→ 直接放行（本地開發模式）</li>
 *   <li>Header {@code X-Admin-Token} 缺失或不符 → 401</li>
 *   <li>Token 相符 → 放行</li>
 * </ul>
 *
 * <p>使用 {@link MessageDigest#isEqual} 做 timing-safe 比較，防止 timing attack。
 */
@Slf4j
@RequiredArgsConstructor
public class AdminTokenFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Admin-Token";
    private static final String ADMIN_PATH_PREFIX = "/api/v1/admin/";

    private final AdminProperties adminProperties;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(ADMIN_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String configuredToken = adminProperties.getToken();

        // 未設定 token → 開發模式，直接放行
        if (!StringUtils.hasText(configuredToken)) {
            log.debug("Admin token not configured — skipping admin auth (dev mode)");
            chain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(HEADER);
        if (!StringUtils.hasText(provided) || !timingSafeEquals(configuredToken, provided)) {
            log.warn("Admin API rejected — invalid or missing X-Admin-Token, uri={}", request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8");
            response.getWriter().write(
                    "{\"code\":401,\"message\":\"Admin token required\",\"data\":null,\"traceId\":null}");
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean timingSafeEquals(String a, String b) {
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }
}
