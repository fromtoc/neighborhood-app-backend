package com.example.app.controller;

import com.example.app.common.result.ApiResponse;
import com.example.app.service.WeatherService;
import com.example.app.service.WeatherService.WeatherResult;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    /**
     * GET /api/v1/weather?city=臺北市&lat=25.03&lng=121.56
     * city 和 lat/lng 至少提供一組。
     * 優先查 CWA（需要 city），fallback Open-Meteo（需要 lat/lng）。
     */
    @GetMapping
    public ApiResponse<WeatherResult> getWeather(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {

        WeatherResult result = weatherService.getWeather(city, lat, lng);
        if (result == null) {
            return ApiResponse.success(null);
        }
        return ApiResponse.success(result);
    }
}
