package com.example.app.service;

/**
 * 地址轉座標服務介面。
 */
public interface GeocodingClient {

    /**
     * 將地址轉換為 WGS84 座標。
     *
     * @param address 完整地址字串，例如「台北市信義區信義路五段7號」
     * @return {@code [lat, lng]} WGS84 座標
     */
    double[] geocode(String address);
}
