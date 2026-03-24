package com.example.app.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.app.common.enums.UserRole;
import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ApiResponse;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.banner.BannerItemResponse;
import com.example.app.dto.banner.BannerSlotResponse;
import com.example.app.entity.BannerItem;
import com.example.app.entity.BannerSlot;
import com.example.app.entity.Place;
import com.example.app.entity.Post;
import com.example.app.mapper.BannerItemMapper;
import com.example.app.mapper.BannerSlotMapper;
import com.example.app.mapper.PlaceMapper;
import com.example.app.mapper.PostMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/banners")
@RequiredArgsConstructor
@Tag(name = "Admin Banner", description = "管理員 — 輪播廣告管理")
public class AdminBannerController {

    private final BannerSlotMapper bannerSlotMapper;
    private final BannerItemMapper bannerItemMapper;
    private final PostMapper postMapper;
    private final PlaceMapper placeMapper;

    private void requireAdmin(JwtClaims claims) {
        if (claims == null) throw new BusinessException(ResultCode.UNAUTHORIZED, "請先登入");
        if (claims.getRole() != UserRole.ADMIN && claims.getRole() != UserRole.SUPER_ADMIN) {
            throw new BusinessException(ResultCode.FORBIDDEN, "需要管理員權限");
        }
    }

    // ── Slot CRUD ──────────────────────────────────────────────

    @GetMapping("/slots")
    @Operation(summary = "列出所有廣告位", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<BannerSlotResponse>> listSlots(@AuthenticationPrincipal JwtClaims claims) {
        requireAdmin(claims);
        List<BannerSlot> slots = bannerSlotMapper.selectList(
                new LambdaQueryWrapper<BannerSlot>().orderByAsc(BannerSlot::getSortOrder));
        return ApiResponse.success(slots.stream().map(BannerSlotResponse::from).toList());
    }

    @PostMapping("/slots")
    @Operation(summary = "新增廣告位", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<BannerSlotResponse> createSlot(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, Object> body
    ) {
        requireAdmin(claims);
        BannerSlot slot = new BannerSlot();
        slot.setName((String) body.get("name"));
        slot.setLabel((String) body.get("label"));
        slot.setMaxItems(body.containsKey("maxItems") ? ((Number) body.get("maxItems")).intValue() : 10);
        slot.setSortOrder(body.containsKey("sortOrder") ? ((Number) body.get("sortOrder")).intValue() : 0);
        slot.setStatus(1);
        bannerSlotMapper.insert(slot);
        return ApiResponse.success(BannerSlotResponse.from(slot));
    }

    @PutMapping("/slots/{id}")
    @Operation(summary = "更新廣告位", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<BannerSlotResponse> updateSlot(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        requireAdmin(claims);
        BannerSlot slot = bannerSlotMapper.selectById(id);
        if (slot == null) throw new BusinessException(ResultCode.NOT_FOUND, "廣告位不存在");
        if (body.containsKey("name")) slot.setName((String) body.get("name"));
        if (body.containsKey("label")) slot.setLabel((String) body.get("label"));
        if (body.containsKey("maxItems")) slot.setMaxItems(((Number) body.get("maxItems")).intValue());
        if (body.containsKey("sortOrder")) slot.setSortOrder(((Number) body.get("sortOrder")).intValue());
        if (body.containsKey("status")) slot.setStatus(((Number) body.get("status")).intValue());
        bannerSlotMapper.updateById(slot);
        return ApiResponse.success(BannerSlotResponse.from(slot));
    }

    // ── Item CRUD ──────────────────────────────────────────────

    @GetMapping("/slots/{slotId}/items")
    @Operation(summary = "列出廣告位下的項目", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<BannerItemResponse>> listItems(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long slotId
    ) {
        requireAdmin(claims);
        List<BannerItem> items = bannerItemMapper.selectList(
                new LambdaQueryWrapper<BannerItem>()
                        .eq(BannerItem::getSlotId, slotId)
                        .orderByAsc(BannerItem::getSortOrder));
        return ApiResponse.success(items.stream().map(BannerItemResponse::from).toList());
    }

    @PostMapping("/items")
    @Operation(summary = "新增廣告項目", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<BannerItemResponse> createItem(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestBody Map<String, Object> body
    ) {
        requireAdmin(claims);
        Long slotId = ((Number) body.get("slotId")).longValue();
        if (bannerSlotMapper.selectById(slotId) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "廣告位不存在");
        }

        BannerItem item = new BannerItem();
        item.setSlotId(slotId);
        item.setSourceType((String) body.get("sourceType"));
        item.setSourceId(((Number) body.get("sourceId")).longValue());
        item.setImageUrl((String) body.get("imageUrl"));
        item.setTitle((String) body.get("title"));
        item.setSortOrder(body.containsKey("sortOrder") ? ((Number) body.get("sortOrder")).intValue() : 0);
        item.setStatus(1);
        if (body.get("startAt") != null) item.setStartAt(LocalDateTime.parse((String) body.get("startAt")));
        if (body.get("endAt") != null) item.setEndAt(LocalDateTime.parse((String) body.get("endAt")));
        bannerItemMapper.insert(item);
        return ApiResponse.success(BannerItemResponse.from(item));
    }

    @PutMapping("/items/{id}")
    @Operation(summary = "更新廣告項目", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<BannerItemResponse> updateItem(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        requireAdmin(claims);
        BannerItem item = bannerItemMapper.selectById(id);
        if (item == null) throw new BusinessException(ResultCode.NOT_FOUND, "廣告項目不存在");

        if (body.containsKey("sourceType")) item.setSourceType((String) body.get("sourceType"));
        if (body.containsKey("sourceId")) item.setSourceId(((Number) body.get("sourceId")).longValue());
        if (body.containsKey("imageUrl")) item.setImageUrl((String) body.get("imageUrl"));
        if (body.containsKey("title")) item.setTitle((String) body.get("title"));
        if (body.containsKey("sortOrder")) item.setSortOrder(((Number) body.get("sortOrder")).intValue());
        if (body.containsKey("status")) item.setStatus(((Number) body.get("status")).intValue());
        if (body.containsKey("startAt")) {
            item.setStartAt(body.get("startAt") != null ? LocalDateTime.parse((String) body.get("startAt")) : null);
        }
        if (body.containsKey("endAt")) {
            item.setEndAt(body.get("endAt") != null ? LocalDateTime.parse((String) body.get("endAt")) : null);
        }
        bannerItemMapper.updateById(item);
        return ApiResponse.success(BannerItemResponse.from(item));
    }

    @DeleteMapping("/items/{id}")
    @Operation(summary = "刪除廣告項目", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<Void> deleteItem(
            @AuthenticationPrincipal JwtClaims claims,
            @PathVariable Long id
    ) {
        requireAdmin(claims);
        if (bannerItemMapper.selectById(id) == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "廣告項目不存在");
        }
        bannerItemMapper.deleteById(id);
        return ApiResponse.success(null);
    }

    // ── 來源搜尋（供前端選擇來源用）──────────────────────

    record SourceOption(String sourceType, Long sourceId, String title, String coverImage, List<String> images) {}

    @GetMapping("/sources")
    @Operation(summary = "搜尋可用來源（貼文/店家）", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<List<SourceOption>> searchSources(
            @AuthenticationPrincipal JwtClaims claims,
            @RequestParam(defaultValue = "post") String type,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "20") int limit
    ) {
        requireAdmin(claims);
        int safeLimit = Math.min(limit, 50);

        if ("place".equals(type)) {
            LambdaQueryWrapper<Place> w = new LambdaQueryWrapper<Place>()
                    .eq(Place::getStatus, 1);
            if (keyword != null && !keyword.isBlank()) {
                w.like(Place::getName, keyword);
            }
            w.orderByDesc(Place::getId).last("LIMIT " + safeLimit);
            List<Place> places = placeMapper.selectList(w);
            List<SourceOption> options = places.stream().map(p -> {
                List<String> imgs = new java.util.ArrayList<>();
                if (p.getCoverImageUrl() != null) imgs.add(p.getCoverImageUrl());
                if (p.getImagesJson() != null) {
                    try {
                        List<String> parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                                .readValue(p.getImagesJson(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                        imgs.addAll(parsed);
                    } catch (Exception ignored) {}
                }
                return new SourceOption("place", p.getId(), p.getName(), p.getCoverImageUrl(), imgs);
            }).toList();
            return ApiResponse.success(options);
        }

        // Post types: info (district_info, li_info), community, guide
        LambdaQueryWrapper<Post> w = new LambdaQueryWrapper<Post>()
                .ge(Post::getStatus, 1);
        if ("info".equals(type)) {
            w.in(Post::getType, List.of("district_info", "li_info"));
        } else if ("guide".equals(type)) {
            w.eq(Post::getType, "guide");
        } else if ("community".equals(type)) {
            w.notIn(Post::getType, List.of("district_info", "li_info", "guide", "broadcast"));
        }
        if (keyword != null && !keyword.isBlank()) {
            w.and(q -> q.like(Post::getTitle, keyword).or().like(Post::getContent, keyword));
        }
        w.orderByDesc(Post::getId).last("LIMIT " + safeLimit);
        List<Post> posts = postMapper.selectList(w);
        List<SourceOption> options = posts.stream().map(p -> {
            List<String> imgs = new java.util.ArrayList<>();
            if (p.getImagesJson() != null) {
                try {
                    List<String> parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                            .readValue(p.getImagesJson(), new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
                    imgs.addAll(parsed);
                } catch (Exception ignored) {}
            }
            String title = p.getTitle() != null ? p.getTitle() : (p.getContent() != null && p.getContent().length() > 30 ? p.getContent().substring(0, 30) + "…" : p.getContent());
            return new SourceOption("post", p.getId(), title, imgs.isEmpty() ? null : imgs.get(0), imgs);
        }).toList();
        return ApiResponse.success(options);
    }
}
