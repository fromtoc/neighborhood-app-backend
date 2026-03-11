package com.example.app.controller;

import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.chat.ChatMessageResponse;
import com.example.app.dto.chat.ChatRoomResponse;
import com.example.app.service.ChatQueryService;
import com.example.app.service.GeoQueryService;
import com.example.app.entity.Neighborhood;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Validated
@Tag(name = "Chat", description = "聊天室 REST API（WebSocket 在 Step 11 加入）")
public class ChatController {

    private final ChatQueryService chatQueryService;
    private final GeoQueryService  geoQueryService;

    @GetMapping("/rooms/{neighborhoodId}")
    @Operation(summary = "取得（或建立）指定里的聊天室")
    public ApiResponse<ChatRoomResponse> getRoom(
            @Parameter(description = "里 ID", required = true)
            @PathVariable Long neighborhoodId
    ) {
        Neighborhood nb = geoQueryService.getLiById(neighborhoodId);
        if (nb == null) throw new BusinessException(ResultCode.NOT_FOUND, "里資料不存在");
        String roomName = nb.getCity() + nb.getDistrict() + nb.getName();
        return ApiResponse.success(chatQueryService.getOrCreateRoom(neighborhoodId, roomName));
    }

    @GetMapping("/rooms/district")
    @Operation(summary = "取得（或建立）指定行政區的聊天室")
    public ApiResponse<ChatRoomResponse> getDistrictRoom(
            @Parameter(description = "城市", required = true) @RequestParam @NotBlank String city,
            @Parameter(description = "行政區", required = true) @RequestParam @NotBlank String district
    ) {
        return ApiResponse.success(chatQueryService.getOrCreateDistrictRoom(city, district));
    }

    @GetMapping("/rooms/{roomId}/messages")
    @Operation(summary = "取得聊天室歷史訊息（cursor-based 分頁）")
    public ApiResponse<List<ChatMessageResponse>> getMessages(
            @PathVariable Long roomId,

            @Parameter(description = "訊息 ID cursor（不傳 = 最新）")
            @RequestParam(required = false) Long before,

            @Parameter(description = "筆數（最大 50）")
            @RequestParam(defaultValue = "30") @Min(1) @Max(50) int limit
    ) {
        return ApiResponse.success(chatQueryService.getMessages(roomId, before, limit));
    }

    @PostMapping("/private/{targetUserId}")
    @Operation(summary = "取得（或建立）與指定用戶的私聊房間（需要第三方登入）",
               security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ChatRoomResponse> getOrCreatePrivateRoom(
            @PathVariable Long targetUserId,
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (claims.getRole() == UserRole.GUEST)
            throw new BusinessException(ResultCode.FORBIDDEN, "私聊功能需要第三方登入（Google / LINE）");
        if (claims.getUserId().equals(targetUserId))
            throw new BusinessException(ResultCode.BAD_REQUEST, "不能與自己私聊");
        return ApiResponse.success(chatQueryService.getOrCreatePrivateRoom(claims.getUserId(), targetUserId));
    }

    @GetMapping("/private/rooms")
    @Operation(summary = "列出目前用戶的所有私聊房間",
               security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<ChatRoomResponse>> listPrivateRooms(
            @AuthenticationPrincipal JwtClaims claims
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        return ApiResponse.success(chatQueryService.listPrivateRooms(claims.getUserId()));
    }

    @PostMapping("/rooms/{roomId}/messages")
    @Operation(summary = "發送訊息（REST fallback）",
               security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<ChatMessageResponse> sendMessage(
            @PathVariable Long roomId,
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, String> body
    ) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        String content = body.get("content");
        if (content == null || content.isBlank())
            throw new BusinessException(ResultCode.BAD_REQUEST, "訊息內容不得為空");
        return ApiResponse.success(chatQueryService.sendMessage(roomId, claims.getUserId(), content));
    }
}
