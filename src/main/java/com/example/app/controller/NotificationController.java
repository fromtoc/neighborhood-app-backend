package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.example.app.common.result.ApiResponse;
import com.example.app.dto.JwtClaims;
import com.example.app.entity.Neighborhood;
import com.example.app.entity.Notification;
import com.example.app.entity.UserDeviceToken;
import com.example.app.entity.UserNotificationSettings;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.mapper.NotificationMapper;
import com.example.app.mapper.UserDeviceTokenMapper;
import com.example.app.mapper.UserNotificationSettingsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final UserDeviceTokenMapper          deviceTokenMapper;
    private final NotificationMapper             notificationMapper;
    private final UserNotificationSettingsMapper settingsMapper;
    private final NeighborhoodMapper             neighborhoodMapper;

    // ── FCM token ──────────────────────────────────────────────────────

    @PutMapping("/token")
    public ApiResponse<Void> upsertToken(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody TokenRequest req) {
        Long userId = claims.getUserId();
        UserDeviceToken existing = deviceTokenMapper.selectOne(
                new LambdaQueryWrapper<UserDeviceToken>()
                        .eq(UserDeviceToken::getUserId, userId)
                        .eq(UserDeviceToken::getPlatform, req.platform() != null ? req.platform() : "unknown"));

        if (existing != null) {
            existing.setToken(req.token());
            deviceTokenMapper.updateById(existing);
        } else {
            UserDeviceToken dt = new UserDeviceToken();
            dt.setUserId(userId);
            dt.setToken(req.token());
            dt.setPlatform(req.platform() != null ? req.platform() : "unknown");
            deviceTokenMapper.insert(dt);
        }
        return ApiResponse.success(null);
    }

    @DeleteMapping("/token")
    public ApiResponse<Void> deleteToken(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(required = false) String platform) {
        Long userId = claims.getUserId();
        var wrapper = new LambdaQueryWrapper<UserDeviceToken>()
                .eq(UserDeviceToken::getUserId, userId);
        if (platform != null) wrapper.eq(UserDeviceToken::getPlatform, platform);
        deviceTokenMapper.delete(wrapper);
        return ApiResponse.success(null);
    }

    // ── 通知收件匣 ─────────────────────────────────────────────────────

    @GetMapping
    public ApiResponse<NotificationListResponse> list(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = claims.getUserId();
        int offset = (page - 1) * size;
        List<Notification> items = notificationMapper.selectList(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .orderByDesc(Notification::getCreatedAt)
                        .last("LIMIT " + size + " OFFSET " + offset));

        long total = notificationMapper.selectCount(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId));

        long unread = notificationMapper.selectCount(
                new LambdaQueryWrapper<Notification>()
                        .eq(Notification::getUserId, userId)
                        .eq(Notification::getIsRead, 0));

        Set<Long> nhIds = items.stream()
                .filter(n -> n.getNeighborhoodId() != null)
                .map(Notification::getNeighborhoodId)
                .collect(Collectors.toSet());
        Map<Long, Neighborhood> nhMap = nhIds.isEmpty() ? Map.of() :
                neighborhoodMapper.selectBatchIds(nhIds).stream()
                        .collect(Collectors.toMap(Neighborhood::getId, nh -> nh));

        List<NotificationDto> dtos = items.stream().map(n -> {
            Neighborhood nh = n.getNeighborhoodId() != null ? nhMap.get(n.getNeighborhoodId()) : null;
            return new NotificationDto(
                    n.getId(), n.getType(), n.getTitle(), n.getBody(),
                    n.getRefType(), n.getRefId(), n.getIsRead(), n.getCreatedAt(),
                    n.getNeighborhoodId(),
                    nh != null ? nh.getName()     : null,
                    nh != null ? nh.getCity()     : null,
                    nh != null ? nh.getDistrict() : null);
        }).toList();

        return ApiResponse.success(new NotificationListResponse(dtos, total, unread, page, size));
    }

    record NotificationListResponse(
            List<NotificationDto> records, long total, long unread, int page, int size) {}

    record NotificationDto(
            Long id, String type, String title, String body,
            String refType, Long refId, Integer isRead, LocalDateTime createdAt,
            Long neighborhoodId, String neighborhoodName, String city, String district) {}

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markRead(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id) {
        notificationMapper.update(null,
                new LambdaUpdateWrapper<Notification>()
                        .eq(Notification::getId, id)
                        .eq(Notification::getUserId, claims.getUserId())
                        .set(Notification::getIsRead, 1));
        return ApiResponse.success(null);
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllRead(@AuthenticationPrincipal JwtClaims claims) {
        notificationMapper.update(null,
                new LambdaUpdateWrapper<Notification>()
                        .eq(Notification::getUserId, claims.getUserId())
                        .eq(Notification::getIsRead, 0)
                        .set(Notification::getIsRead, 1));
        return ApiResponse.success(null);
    }

    // ── 通知設定 ───────────────────────────────────────────────────────

    @GetMapping("/settings")
    public ApiResponse<UserNotificationSettings> getSettings(
            @AuthenticationPrincipal JwtClaims claims) {
        Long userId = claims.getUserId();
        UserNotificationSettings s = settingsMapper.selectById(userId);
        if (s == null) {
            s = new UserNotificationSettings();
            s.setUserId(userId);
            s.setNewPost(1);
            s.setNewInfo(1);
            s.setChat(1);
            s.setPrivateMessage(1);
        }
        return ApiResponse.success(s);
    }

    @PutMapping("/settings")
    public ApiResponse<Void> updateSettings(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody SettingsRequest req) {
        Long userId = claims.getUserId();
        UserNotificationSettings existing = settingsMapper.selectById(userId);
        if (existing == null) {
            UserNotificationSettings s = new UserNotificationSettings();
            s.setUserId(userId);
            s.setNewPost(req.newPost() != null ? req.newPost() : 1);
            s.setNewInfo(req.newInfo() != null ? req.newInfo() : 1);
            s.setChat(req.chat() != null ? req.chat() : 1);
            s.setPrivateMessage(req.privateMessage() != null ? req.privateMessage() : 1);
            settingsMapper.insert(s);
        } else {
            if (req.newPost()        != null) existing.setNewPost(req.newPost());
            if (req.newInfo()        != null) existing.setNewInfo(req.newInfo());
            if (req.chat()           != null) existing.setChat(req.chat());
            if (req.privateMessage() != null) existing.setPrivateMessage(req.privateMessage());
            settingsMapper.updateById(existing);
        }
        return ApiResponse.success(null);
    }

    // ── DTOs ──────────────────────────────────────────────────────────

    record TokenRequest(String token, String platform) {}

    record SettingsRequest(Integer newPost, Integer newInfo,
                           Integer chat, Integer privateMessage) {}
}
