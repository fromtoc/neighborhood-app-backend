package com.example.app.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * 呼叫 Next.js On-demand Revalidation API（POST /api/revalidate）。
 * <p>
 * 設定方式（application.yml 或環境變數）：
 * <pre>
 *   web.base-url: http://web:3000        （Docker Compose 內部通訊）
 *   web.revalidate-secret: your-secret
 * </pre>
 * 未設定時靜默跳過，不影響主業務流程。
 */
@Slf4j
@Service
public class WebRevalidateService {

    @Value("${web.base-url:}")
    private String webBaseUrl;

    @Value("${web.revalidate-secret:}")
    private String revalidateSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 非同步觸發指定路徑的 ISR 重新產生。
     * 呼叫失敗時僅記錄 warn，不拋出例外。
     */
    @Async
    public void revalidatePaths(List<String> paths) {
        if (webBaseUrl.isBlank() || revalidateSecret.isBlank()) return;
        try {
            Map<String, Object> body = Map.of(
                    "secret", revalidateSecret,
                    "paths", paths
            );
            restTemplate.postForEntity(webBaseUrl + "/api/revalidate", body, String.class);
            log.debug("[Revalidate] triggered paths: {}", paths);
        } catch (Exception e) {
            log.warn("[Revalidate] failed to call Next.js revalidate: {}", e.getMessage());
        }
    }
}
