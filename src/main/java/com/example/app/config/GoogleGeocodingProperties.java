package com.example.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "google.geocoding")
public class GoogleGeocodingProperties {

    private String apiKey;
    private String baseUrl = "https://maps.googleapis.com/maps/api/geocode/json";
}
