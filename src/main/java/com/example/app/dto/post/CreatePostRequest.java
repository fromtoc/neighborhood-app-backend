package com.example.app.dto.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class CreatePostRequest {

    @NotNull
    private Long neighborhoodId;

    @Size(max = 255)
    private String title;

    @NotBlank
    @Size(max = 5000)
    private String content;

    /** info | broadcast | fresh | store_visit | selling | renting | group_buy | group_event | free_give | help | want_rent | find | recruit | report */
    private String type = "fresh";

    /** li | district — 貼文範圍（預設 li） */
    private String scope = "li";

    /** normal | medium | urgent  (僅 info/broadcast 適用) */
    private String urgency = "normal";

    private Long placeId;

    /** 圖片 URL 清單（最多 9 張） */
    @Size(max = 9)
    private List<String> images;

    /** 分類專屬欄位，如 {price: "100", quantity: "2", deadline: "2026-04-01"} */
    private Map<String, Object> extra;
}
