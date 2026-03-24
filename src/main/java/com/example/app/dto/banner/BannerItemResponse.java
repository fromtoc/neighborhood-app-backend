package com.example.app.dto.banner;

import com.example.app.entity.BannerItem;
import lombok.Data;

@Data
public class BannerItemResponse {
    private Long id;
    private Long slotId;
    private String sourceType;
    private Long sourceId;
    private String imageUrl;
    private String title;
    private Integer sortOrder;
    private Integer status;
    private String startAt;
    private String endAt;

    public static BannerItemResponse from(BannerItem item) {
        BannerItemResponse resp = new BannerItemResponse();
        resp.setId(item.getId());
        resp.setSlotId(item.getSlotId());
        resp.setSourceType(item.getSourceType());
        resp.setSourceId(item.getSourceId());
        resp.setImageUrl(item.getImageUrl());
        resp.setTitle(item.getTitle());
        resp.setSortOrder(item.getSortOrder());
        resp.setStatus(item.getStatus());
        if (item.getStartAt() != null) resp.setStartAt(item.getStartAt().toString());
        if (item.getEndAt() != null) resp.setEndAt(item.getEndAt().toString());
        return resp;
    }
}
