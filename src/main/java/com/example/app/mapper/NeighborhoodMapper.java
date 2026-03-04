package com.example.app.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.app.entity.Neighborhood;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NeighborhoodMapper extends BaseMapper<Neighborhood> {

    int batchUpsert(@Param("list") List<Neighborhood> list);

    /** 取得所有有效縣市清單（去重、排序）。 */
    List<String> selectDistinctCities();

    /** 取得指定縣市下所有有效行政區清單（去重、排序）。 */
    List<String> selectDistinctDistricts(@Param("city") String city);

    /** Point-in-Polygon：找出包含指定座標的里（最多 1 筆）。 */
    Neighborhood findContaining(@Param("lng") double lng, @Param("lat") double lat);

    /**
     * 圓形交疊：找出多邊形邊界與指定圓形近似多邊形有交疊的里，
     * 依中心距升冪排序。
     *
     * @param circleWkt WKT POLYGON 字串（近似圓形）
     * @param lng       查詢點經度（用於 ORDER BY 距離計算）
     * @param lat       查詢點緯度
     */
    List<Neighborhood> findIntersecting(
            @Param("circleWkt") String circleWkt,
            @Param("lng") double lng,
            @Param("lat") double lat);
}
