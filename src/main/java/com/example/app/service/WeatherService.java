package com.example.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherService {

    private final RestTemplate  restTemplate;
    private final ObjectMapper  objectMapper;

    @Value("${cwa.api-key}")
    private String cwaApiKey;

    // ── 公開介面 ──────────────────────────────────────────────────────────

    public record WeatherPeriod(
            String startTime, String endTime,
            String wx, int wxCode,
            String pop, String minT, String maxT) {}

    public record WeatherResult(String source, String city, List<WeatherPeriod> periods) {}

    /**
     * 取得天氣預報。
     * cache key = "weather::{city}::{lat}::{lng}"，TTL 由 CacheConfig 設定 30 分鐘。
     */
    @Cacheable(value = "weather", key = "#city + '::' + #lat + '::' + #lng",
               unless = "#result == null || #result.periods().isEmpty()")
    public WeatherResult getWeather(String city, Double lat, Double lng) {
        // 優先 CWA（有 city 名稱才能查）
        if (city != null && !city.isBlank()) {
            List<WeatherPeriod> cwa = fromCwa(city);
            if (cwa != null && !cwa.isEmpty()) return new WeatherResult("cwa", city, cwa);
        }
        // fallback Open-Meteo（需要座標）
        if (lat != null && lng != null) {
            List<WeatherPeriod> om = fromOpenMeteo(lat, lng);
            if (om != null && !om.isEmpty()) return new WeatherResult("open-meteo", city, om);
        }
        return null;
    }

    // ── CWA F-C0032-001（縣市36小時預報）────────────────────────────────

    private List<WeatherPeriod> fromCwa(String city) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl("https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001")
                    .queryParam("Authorization", cwaApiKey)
                    .queryParam("format", "JSON")
                    .queryParam("locationName", city)
                    .build(false).toUriString();

            String body = restTemplate.getForObject(url, String.class);
            if (body == null) return null;

            JsonNode root     = objectMapper.readTree(body);
            JsonNode location = root.path("records").path("location").path(0);
            if (location.isMissingNode()) return null;

            Map<String, List<JsonNode>> elMap = new LinkedHashMap<>();
            for (JsonNode el : location.path("weatherElement")) {
                List<JsonNode> times = new ArrayList<>();
                el.path("time").forEach(times::add);
                elMap.put(el.path("elementName").asText(), times);
            }

            List<JsonNode> wxList = elMap.getOrDefault("Wx", List.of());
            List<WeatherPeriod> result = new ArrayList<>();
            for (int i = 0; i < wxList.size(); i++) {
                JsonNode wx   = wxList.get(i);
                JsonNode param = wx.path("parameter");
                result.add(new WeatherPeriod(
                        wx.path("startTime").asText(),
                        wx.path("endTime").asText(),
                        param.path("parameterName").asText(),
                        param.path("parameterValue").asInt(0),
                        getParam(elMap, "PoP", i),
                        getParam(elMap, "MinT", i),
                        getParam(elMap, "MaxT", i)
                ));
            }
            return result;
        } catch (Exception e) {
            log.debug("CWA weather fetch failed: {}", e.getMessage());
            return null;
        }
    }

    private String getParam(Map<String, List<JsonNode>> map, String key, int idx) {
        List<JsonNode> list = map.get(key);
        if (list == null || idx >= list.size()) return "-";
        return list.get(idx).path("parameter").path("parameterName").asText("-");
    }

    // ── Open-Meteo（逐小時 → 聚合3時段）────────────────────────────────

    private List<WeatherPeriod> fromOpenMeteo(double lat, double lng) {
        try {
            String url = String.format(
                    "https://api.open-meteo.com/v1/forecast" +
                    "?latitude=%.6f&longitude=%.6f" +
                    "&hourly=temperature_2m,precipitation_probability,weather_code" +
                    "&timezone=Asia%%2FTaipei&forecast_days=2",
                    lat, lng);

            String body = restTemplate.getForObject(url, String.class);
            if (body == null) return null;

            JsonNode root   = objectMapper.readTree(body);
            JsonNode hourly = root.path("hourly");
            List<String> times = new ArrayList<>();
            hourly.path("time").forEach(n -> times.add(n.asText()));
            double[] temps  = toDoubleArray(hourly.path("temperature_2m"));
            double[] pops   = toDoubleArray(hourly.path("precipitation_probability"));
            int[]    codes  = toIntArray(hourly.path("weather_code"));

            String today    = times.isEmpty() ? "" : times.get(0).substring(0, 10);
            String tomorrow = today.isEmpty() ? "" :
                    LocalDate.parse(today, DateTimeFormatter.ISO_LOCAL_DATE)
                             .plusDays(1).toString();

            String[][] defs = {
                { today + "T06:00", today + "T18:00"    },
                { today + "T18:00", tomorrow + "T06:00" },
                { tomorrow + "T06:00", tomorrow + "T18:00" },
            };

            List<WeatherPeriod> result = new ArrayList<>();
            for (String[] def : defs) {
                String start = def[0], end = def[1];
                List<Integer> idxs = new ArrayList<>();
                for (int i = 0; i < times.size(); i++) {
                    if (times.get(i).compareTo(start) >= 0 && times.get(i).compareTo(end) < 0)
                        idxs.add(i);
                }
                if (idxs.isEmpty()) {
                    result.add(new WeatherPeriod(start + ":00", end + ":00", "-", 0, "0", "-", "-"));
                    continue;
                }
                double minT = idxs.stream().mapToDouble(i -> temps[i]).min().orElse(0);
                double maxT = idxs.stream().mapToDouble(i -> temps[i]).max().orElse(0);
                double maxP = idxs.stream().mapToDouble(i -> pops[i]).max().orElse(0);
                // 最常出現的 weather_code
                Map<Integer, Integer> cnt = new LinkedHashMap<>();
                for (int i : idxs) cnt.merge(codes[i], 1, Integer::sum);
                int domCode = cnt.entrySet().stream()
                        .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(0);

                result.add(new WeatherPeriod(
                        start.replace("T", " ") + ":00",
                        end.replace("T", " ") + ":00",
                        wmoLabel(domCode), domCode,
                        String.valueOf((int) Math.round(maxP)),
                        String.valueOf((int) Math.round(minT)),
                        String.valueOf((int) Math.round(maxT))
                ));
            }
            return result;
        } catch (Exception e) {
            log.debug("Open-Meteo fetch failed: {}", e.getMessage());
            return null;
        }
    }

    private double[] toDoubleArray(JsonNode node) {
        double[] arr = new double[node.size()];
        for (int i = 0; i < node.size(); i++) arr[i] = node.get(i).asDouble();
        return arr;
    }

    private int[] toIntArray(JsonNode node) {
        int[] arr = new int[node.size()];
        for (int i = 0; i < node.size(); i++) arr[i] = node.get(i).asInt();
        return arr;
    }

    private static String wmoLabel(int code) {
        if (code == 0)  return "晴天";
        if (code == 1)  return "大致晴朗";
        if (code == 2)  return "局部多雲";
        if (code == 3)  return "陰天";
        if (code <= 48) return "霧";
        if (code <= 55) return "毛毛雨";
        if (code <= 57) return "凍雨";
        if (code == 61) return "小雨";
        if (code == 63) return "中雨";
        if (code <= 65) return "大雨";
        if (code <= 77) return "降雪";
        if (code <= 82) return "短暫陣雨";
        if (code <= 86) return "陣雪";
        if (code == 95) return "雷雨";
        return "強雷雨";
    }
}
