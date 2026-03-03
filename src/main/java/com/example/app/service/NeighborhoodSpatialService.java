package com.example.app.service;

import com.example.app.dto.neighborhood.IntersectResponse;
import com.example.app.dto.neighborhood.LocateResponse;

import java.util.List;

/**
 * 空間查詢服務：Point-in-Polygon 定位 與 圓形範圍交疊查詢。
 */
public interface NeighborhoodSpatialService {

    /**
     * 依 GPS 座標或地址定位所在里。lat/lng 優先；若未提供則使用 address 呼叫地址轉座標服務。
     *
     * @param lat     緯度（可為 null，此時必須提供 address）
     * @param lng     經度（可為 null，此時必須提供 address）
     * @param address 地址字串（可為 null，此時必須提供 lat/lng）
     * @return 定位結果
     */
    LocateResponse locate(Double lat, Double lng, String address);

    /**
     * 找出與指定圓形範圍（中心 + 半徑）多邊形邊界有交疊的所有里，依中心距升冪排序。
     *
     * @param lat          中心緯度
     * @param lng          中心經度
     * @param radiusMeters 半徑（公尺）
     * @return 交疊里清單
     */
    List<IntersectResponse> nearby(double lat, double lng, int radiusMeters);
}
