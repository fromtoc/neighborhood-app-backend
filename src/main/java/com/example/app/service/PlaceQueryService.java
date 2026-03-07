package com.example.app.service;

import com.example.app.common.result.PageResult;
import com.example.app.entity.Place;

import java.util.List;

/**
 * 地點查詢 Service（App / Web 共用）。
 */
public interface PlaceQueryService {

    /**
     * 分頁查詢指定里的地點清單。
     *
     * @param neighborhoodId 里 ID
     * @param categoryId     分類 ID（null = 全部）
     * @param keyword        關鍵字搜尋（null = 不過濾）
     * @param page           頁碼（從 1 開始）
     * @param size           每頁筆數
     */
    PageResult<Place> listByNeighborhood(Long neighborhoodId, Long categoryId,
                                         String keyword, int page, int size);

    /** 依 ID 取得單筆地點 */
    Place getById(Long id);

    /** 取得指定里 + 分類的所有地點（不分頁，供地圖使用） */
    List<Place> listAllByNeighborhood(Long neighborhoodId, Long categoryId);
}
