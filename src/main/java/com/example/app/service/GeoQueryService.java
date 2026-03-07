package com.example.app.service;

import com.example.app.entity.Neighborhood;

import java.util.List;

/**
 * 地理層級查詢 Service（App / Web 共用）
 *
 * <p>以現有 neighborhood 表（city / district / name 欄位）提供
 * 三層地理結構查詢。Step 12 新增 seo_slug 後，
 * 可在此擴充 slug-based 查詢方法，不需修改呼叫端。
 */
public interface GeoQueryService {

    /** 取得所有縣市（distinct, 排序）*/
    List<String> getCities();

    /** 取得指定縣市的所有行政區（distinct, 排序）*/
    List<String> getDistricts(String city);

    /** 取得指定縣市 + 行政區下的所有里（status=1）*/
    List<Neighborhood> listLisByDistrict(String city, String district);

    /**
     * 依縣市 + 行政區 + 里名稱取得單筆里資料。
     * Step 12 加入 seo_slug 後改為 slug 查詢。
     */
    Neighborhood getLi(String city, String district, String liName);

    /** 依 ID 取得單筆里資料 */
    Neighborhood getLiById(Long id);
}
