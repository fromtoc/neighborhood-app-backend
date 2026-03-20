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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
@Order(1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final int MAX_BODY_LOG = 500;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (uri.startsWith("/actuator") || uri.startsWith("/ws")) {
            chain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper  req  = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper resp = new ContentCachingResponseWrapper(response);

        LocalDateTime requestTime = LocalDateTime.now();
        long start = System.currentTimeMillis();

        try {
            chain.doFilter(req, resp);
        } finally {
            long ms = System.currentTimeMillis() - start;
            int status = resp.getStatus();
            String ip = getClientIp(request);
            String method = request.getMethod();
            String query = request.getQueryString() != null ? "?" + request.getQueryString() : "";

            // 一行完整記錄：時間 + 方法 + 路徑 + 狀態碼 + 耗時 + IP
            StringBuilder sb = new StringBuilder();
            sb.append("[API] ").append(requestTime.format(FMT));
            sb.append(" | ").append(method).append(" ").append(uri).append(query);
            sb.append(" → ").append(status);
            sb.append(" (").append(ms).append("ms)");
            sb.append(" | ip=").append(ip);

            // body 摘要（只在有內容時附加）
            String reqBody  = toStr(req.getContentAsByteArray(), request.getContentType());
            String respBody = toStr(resp.getContentAsByteArray(), resp.getContentType());
            if (!reqBody.isEmpty()) sb.append(" | req=").append(reqBody);
            if (!respBody.isEmpty() && log.isDebugEnabled()) sb.append(" | res=").append(respBody);

            if (status >= 400) {
                // 錯誤請求用 WARN，附帶 response body
                if (!respBody.isEmpty()) sb.append(" | res=").append(respBody);
                log.warn(sb.toString());
            } else {
                log.info(sb.toString());
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
