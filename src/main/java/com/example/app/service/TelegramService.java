package com.example.app.service;

import com.example.app.config.TelegramProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class TelegramService {

    private final TelegramProperties properties;
    private final RestClient restClient = RestClient.create();
    private final boolean enabled;

    public TelegramService(TelegramProperties properties) {
        this.properties = properties;
        this.enabled = properties.getBotToken() != null && !properties.getBotToken().isBlank()
                    && properties.getChatId() != null && !properties.getChatId().isBlank();
        if (enabled) {
            log.info("[Telegram] 通知服務已啟用, chatId={}", properties.getChatId());
        } else {
            log.info("[Telegram] 未設定 bot-token 或 chat-id，通知服務停用");
        }
    }

    /** 同步發送，適合少量關鍵告警 */
    public void send(String message) {
        if (!enabled) return;
        try {
            String url = String.format(
                "https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=HTML",
                properties.getBotToken(),
                properties.getChatId(),
                URLEncoder.encode(message, StandardCharsets.UTF_8)
            );
            restClient.get().uri(url).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.warn("[Telegram] 發送失敗: {}", e.getMessage());
        }
    }

    /** 異步發送，適合非關鍵通知 */
    @Async
    public void sendAsync(String message) {
        send(message);
    }

    /** 帶標籤的告警 */
    public void alert(String tag, String content) {
        String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MM-dd HH:mm:ss"));
        send(String.format("🚨 <b>[%s]</b>\n%s\n<i>%s</i>", tag, content, time));
    }

    /** 帶標籤的一般通知 */
    public void notify(String tag, String content) {
        String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MM-dd HH:mm:ss"));
        send(String.format("📢 <b>[%s]</b>\n%s\n<i>%s</i>", tag, content, time));
    }

    public boolean isEnabled() {
        return enabled;
    }
}
