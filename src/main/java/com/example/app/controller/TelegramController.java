package com.example.app.controller;

import com.example.app.common.result.ApiResponse;
import com.example.app.dto.JwtClaims;
import com.example.app.service.TelegramService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/telegram")
@RequiredArgsConstructor
@Tag(name = "Telegram", description = "Telegram 通知")
public class TelegramController {

    private final TelegramService telegramService;

    @PostMapping("/log")
    @Operation(summary = "App 端發送 log 到 Telegram 群組", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> sendLog(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, String> body
    ) {
        String tag = body.getOrDefault("tag", "App");
        String message = body.getOrDefault("message", "");
        String level = body.getOrDefault("level", "info");

        if (message.isBlank()) {
            return ApiResponse.success(null);
        }

        String nickname = claims != null ? "User#" + claims.getUserId() : "anonymous";
        String content = String.format("%s\n👤 %s", message, nickname);

        if ("error".equalsIgnoreCase(level) || "alert".equalsIgnoreCase(level)) {
            telegramService.alert(tag, content);
        } else {
            telegramService.notify(tag, content);
        }

        return ApiResponse.success(null);
    }
}
