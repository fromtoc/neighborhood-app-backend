package com.example.app.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@Order(1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final int MAX_BODY_LOG = 500;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (uri.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper  req  = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper resp = new ContentCachingResponseWrapper(response);

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, resp);
        } finally {
            long ms = System.currentTimeMillis() - start;
            String ip = getClientIp(request);
            String query = request.getQueryString() != null ? "?" + request.getQueryString() : "";
            int status = resp.getStatus();

            // 一行搞定：方法 路徑 → 狀態碼 耗時 IP
            log.info("[API] {} {}{} → {} ({}ms) ip={}",
                    request.getMethod(), uri, query, status, ms, ip);

            // body 只在 DEBUG 時印出（開發用）
            if (log.isDebugEnabled()) {
                String reqBody  = toStr(req.getContentAsByteArray(),  request.getContentType());
                String respBody = toStr(resp.getContentAsByteArray(), resp.getContentType());
                if (!reqBody.isEmpty()) log.debug("  ↑ req: {}", reqBody);
                if (!respBody.isEmpty()) log.debug("  ↓ res: {}", respBody);
            }

            resp.copyBodyToResponse();
        }
    }

    private String toStr(byte[] bytes, String contentType) {
        if (bytes == null || bytes.length == 0) return "";
        if (contentType == null) return "";
        if (!contentType.contains("json") && !contentType.contains("text") &&
            !contentType.contains("xml") && !contentType.contains("form")) return "";
        String body = new String(bytes, StandardCharsets.UTF_8);
        if (body.length() > MAX_BODY_LOG) {
            return body.substring(0, MAX_BODY_LOG) + "...(truncated)";
        }
        return body;
    }

    private String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
