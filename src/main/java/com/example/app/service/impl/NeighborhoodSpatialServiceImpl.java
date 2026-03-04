package com.example.app.service.impl;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;
import com.example.app.dto.neighborhood.IntersectResponse;
import com.example.app.dto.neighborhood.LocateResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.GeocodingClient;
import com.example.app.service.NeighborhoodSpatialService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NeighborhoodSpatialServiceImpl implements NeighborhoodSpatialService {

    private static final double EARTH_RADIUS_M  = 6_371_000.0;
    private static final int    CIRCLE_SEGMENTS = 36;

    private final NeighborhoodMapper neighborhoodMapper;

    /** 可選：僅在設定 tgos.api-key 時注入。 */
    @Autowired(required = false)
    private GeocodingClient geocodingClient;

    // ── locate ────────────────────────────────────────────────────

    @Override
    public LocateResponse locate(Double lat, Double lng, String address) {
        double[] coords = resolveCoords(lat, lng, address);
        double   qlat   = coords[0];
        double   qlng   = coords[1];

        Neighborhood nb = neighborhoodMapper.findContaining(qlng, qlat);
        if (nb == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "找不到所在里");
        }
        return LocateResponse.from(nb);
    }

    // ── nearby ────────────────────────────────────────────────────

    @Override
    public List<IntersectResponse> nearby(double lat, double lng, int radiusMeters) {
        String circleWkt = buildCircleWkt(lat, lng, radiusMeters);
        log.debug("nearby circleWkt={}", circleWkt);

        List<Neighborhood> hits = neighborhoodMapper.findIntersecting(circleWkt, lng, lat);
        return hits.stream()
                .map(n -> {
                    int dist = n.getLat() != null && n.getLng() != null
                            ? haversineMeters(lat, lng,
                                    n.getLat().doubleValue(), n.getLng().doubleValue())
                            : Integer.MAX_VALUE;
                    return IntersectResponse.from(n, dist);
                })
                .toList();
    }

    // ── helpers ──────────────────────────────────────────────────

    /**
     * 解析座標：lat/lng 優先；否則透過地址轉座標服務取得。
     *
     * @return [lat, lng]
     */
    private double[] resolveCoords(Double lat, Double lng, String address) {
        if (lat != null && lng != null) {
            return new double[]{lat, lng};
        }
        if (!StringUtils.hasText(address)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "請提供 lat/lng 或 address 參數");
        }
        if (geocodingClient == null) {
            throw new BusinessException(ResultCode.SERVICE_UNAVAILABLE, "地址查詢服務未啟用，請設定 TGOS_API_KEY");
        }
        return geocodingClient.geocode(address);
    }

    /**
     * 以 36 個頂點近似圓形，產生 WKT POLYGON。
     * 座標順序：SRID 4326 軸序 (lat lng)。
     *
     * @param lat          中心緯度
     * @param lng          中心經度
     * @param radiusMeters 半徑（公尺）
     * @return WKT 字串，例如 {@code POLYGON((lat0 lng0, lat1 lng1, ..., lat0 lng0))}
     */
    static String buildCircleWkt(double lat, double lng, int radiusMeters) {
        double latDeg = radiusMeters / 111_320.0;
        double lngDeg = radiusMeters / (111_320.0 * Math.cos(Math.toRadians(lat)));

        StringBuilder sb = new StringBuilder("POLYGON((");
        for (int i = 0; i <= CIRCLE_SEGMENTS; i++) {
            double angle = 2 * Math.PI * i / CIRCLE_SEGMENTS;
            double ptLat = lat + latDeg * Math.sin(angle);
            double ptLng = lng + lngDeg * Math.cos(angle);
            if (i > 0) sb.append(", ");
            sb.append(ptLat).append(' ').append(ptLng);
        }
        sb.append("))");
        return sb.toString();
    }

    private static int haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                  * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (int) Math.round(EARTH_RADIUS_M * c);
    }
}
