package com.example.app.dto.banner;

import com.example.app.entity.BannerSlot;
import lombok.Data;

@Data
public class BannerSlotResponse {
    private Long id;
    private String name;
    private String label;
    private Integer maxItems;
    private Integer sortOrder;
    private Integer status;

    public static BannerSlotResponse from(BannerSlot slot) {
        BannerSlotResponse resp = new BannerSlotResponse();
        resp.setId(slot.getId());
        resp.setName(slot.getName());
        resp.setLabel(slot.getLabel());
        resp.setMaxItems(slot.getMaxItems());
        resp.setSortOrder(slot.getSortOrder());
        resp.setStatus(slot.getStatus());
        return resp;
    }
}
