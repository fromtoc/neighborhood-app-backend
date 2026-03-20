package com.example.app.controller;

import com.example.app.common.result.ApiResponse;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@RestController
@RequestMapping("/api/v1/garbage-trucks")
@RequiredArgsConstructor
@Tag(name = "GarbageTruck", description = "垃圾車即時追蹤")
public class GarbageTruckController {

    private final NeighborhoodMapper neighborhoodMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${garbage-truck.crawler-url:http://127.0.0.1:5501}")
    private String crawlerUrl;

    // 車輛快取
    private volatile List<Map<String, Object>> cachedCars = List.of();
    private volatile LocalDateTime lastUpdate;
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);

    // 里邊界 GeoJSON 快取（里的邊界不會變）
    private final ConcurrentHashMap<Long, String> boundaryCache = new ConcurrentHashMap<>();

    record TruckInfo(
        String carId, double lat, double lng,
        String carType, String addr, String cleanStatus, String status
    ) {}

    @Scheduled(fixedDelay = 15000, initialDelay = 5000)
    public void pullFromCrawler() {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(crawlerUrl + "/api/cars", Map.class);
            if (resp != null && resp.get("cars") instanceof List<?> cars) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> carList = (List<Map<String, Object>>) cars;
                cachedCars = carList;
                lastUpdate = LocalDateTime.now();
                if (consecutiveFailures.getAndSet(0) > 0) {
                    log.info("[垃圾車] 爬蟲連線恢復，同步 {} 台車輛", carList.size());
                } else {
                    log.debug("[垃圾車] 同步 {} 台車輛", carList.size());
                }
            }
        } catch (Exception e) {
            int failures = consecutiveFailures.incrementAndGet();
            if (failures == 1 || failures % 20 == 0) {
                log.warn("[垃圾車] 同步失敗（連續 {} 次）: {}", failures, e.getMessage());
            }
        }
    }

    @GetMapping
    @Operation(summary = "取得指定里範圍內的垃圾車")
    public ApiResponse<Map<String, Object>> getTrucks(
            @RequestParam Long neighborhoodId,
            @RequestParam(defaultValue = "500") int radiusMeters
    ) {
        if (cachedCars.isEmpty()) {
            return ApiResponse.success(Map.of("trucks", List.of(), "count", 0, "lastUpdate", ""));
        }

        Neighborhood nh = neighborhoodMapper.selectById(neighborhoodId);
        if (nh == null || nh.getLat() == null || nh.getLng() == null) {
            return ApiResponse.success(Map.of("trucks", List.of(), "count", 0, "lastUpdate", ""));
        }

        double centerLat = nh.getLat().doubleValue();
        double centerLng = nh.getLng().doubleValue();

        List<TruckInfo> nearby = new ArrayList<>();
        for (Map<String, Object> car : cachedCars) {
            double carLat = toDouble(car.get("lat"));
            double carLng = toDouble(car.get("lng"));
            if (carLat == 0 || carLng == 0) continue;

            double dist = haversine(centerLat, centerLng, carLat, carLng);
            if (dist <= radiusMeters) {
                nearby.add(new TruckInfo(
                    str(car.get("car_id")), carLat, carLng,
                    str(car.get("car_type")), str(car.get("addr")),
                    str(car.get("clean_status")), str(car.get("status"))
                ));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trucks", nearby);
        result.put("count", nearby.size());
        result.put("center", Map.of("lat", centerLat, "lng", centerLng));
        result.put("neighborhood", nh.getName());
        result.put("city", nh.getCity());
        result.put("district", nh.getDistrict());
        result.put("lastUpdate", lastUpdate != null ? lastUpdate.toString() : "");
        return ApiResponse.success(result);
    }

    @GetMapping("/all")
    @Operation(summary = "取得所有垃圾車（地圖顯示用）")
    public ApiResponse<Map<String, Object>> getAllTrucks() {
        List<TruckInfo> all = cachedCars.stream().map(car -> new TruckInfo(
            str(car.get("car_id")), toDouble(car.get("lat")), toDouble(car.get("lng")),
            str(car.get("car_type")), str(car.get("addr")),
            str(car.get("clean_status")), str(car.get("status"))
        )).filter(t -> t.lat() != 0 && t.lng() != 0).toList();

        return ApiResponse.success(Map.of(
            "trucks", all, "count", all.size(),
            "lastUpdate", lastUpdate != null ? lastUpdate.toString() : ""
        ));
    }

    @GetMapping("/boundary")
    @Operation(summary = "取得里的邊界 GeoJSON")
    public ApiResponse<Map<String, Object>> getBoundary(@RequestParam Long neighborhoodId) {
        String geojson = boundaryCache.computeIfAbsent(neighborhoodId, id -> {
            List<Map<String, Object>> rows = neighborhoodMapper.selectBoundaryAsGeoJson(id);
            if (rows == null || rows.isEmpty() || rows.get(0).get("geojson") == null) {
                return "";
            }
            return rows.get(0).get("geojson").toString();
        });

        if (geojson.isEmpty()) {
            return ApiResponse.success(Map.of("geojson", (Object) null, "neighborhoodId", neighborhoodId));
        }
        return ApiResponse.success(Map.of("geojson", geojson, "neighborhoodId", neighborhoodId));
    }

    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private double toDouble(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0; }
    }

    private String str(Object v) { return v != null ? v.toString() : ""; }
}
