package com.example.app.service.impl;

import com.example.app.dto.admin.CsvRowError;
import com.example.app.dto.admin.ImportResult;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.NeighborhoodGeoJsonImportService;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Parses a GeoJSON FeatureCollection (NLSC 村里界 format) one feature at a time
 * using Jackson streaming, then bulk-upserts via {@code neighborhoodMapper.batchUpsert()}.
 *
 * <p>Field mapping:
 * <pre>
 *   VILLCODE              → liCode  (upsert key)
 *   COUNTYNAME            → city
 *   TOWNNAME              → district
 *   VILLNAME              → name    (fallback "未編定" when blank)
 *   COUNTY+TOWN+VILLNAME  → fullName
 *   geometry centroid     → lat / lng  (WGS84, DECIMAL(9/10,7))
 *   NOTE == "未編定村里"  → status=0, otherwise status=1
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NeighborhoodGeoJsonImportServiceImpl implements NeighborhoodGeoJsonImportService {

    private static final int    BATCH_SIZE       = 500;
    private static final int    MAX_ERRORS       = 20;
    private static final String UNASSIGNED_NOTE  = "未編定村里";
    private static final String UNASSIGNED_NAME  = "未編定";

    private final NeighborhoodMapper neighborhoodMapper;
    private final ObjectMapper        objectMapper;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    // ── public API ────────────────────────────────────────────────

    @Override
    public ImportResult importGeoJson(InputStream in) {
        List<CsvRowError>  errors       = new ArrayList<>();
        List<Neighborhood> batch        = new ArrayList<>(BATCH_SIZE);
        int                successCount = 0;
        int                failureCount = 0;
        int                featureIndex = 0;

        try (JsonParser parser = objectMapper.createParser(in)) {
            advanceToFeatures(parser);

            while (parser.nextToken() != JsonToken.END_ARRAY) {
                featureIndex++;
                try {
                    JsonNode feature = objectMapper.readTree(parser);
                    batch.add(toNeighborhood(feature));

                    if (batch.size() >= BATCH_SIZE) {
                        neighborhoodMapper.batchUpsert(batch);
                        successCount += batch.size();
                        batch.clear();
                    }
                } catch (Exception e) {
                    failureCount++;
                    if (errors.size() < MAX_ERRORS) {
                        errors.add(new CsvRowError(featureIndex, e.getMessage()));
                    }
                    log.warn("GeoJSON feature #{} skipped: {}", featureIndex, e.getMessage());
                }
            }

            // flush remainder
            if (!batch.isEmpty()) {
                neighborhoodMapper.batchUpsert(batch);
                successCount += batch.size();
            }

        } catch (IOException e) {
            throw new RuntimeException("Failed to parse GeoJSON: " + e.getMessage(), e);
        }

        if (successCount > 0) {
            invalidateCache();
        }

        log.info("GeoJSON import done: success={}, failure={}", successCount, failureCount);
        return ImportResult.builder()
                .successCount(successCount)
                .failureCount(failureCount)
                .errors(errors)
                .build();
    }

    // ── streaming navigation ──────────────────────────────────────

    /** Advances the parser until it is positioned at the START_ARRAY of "features". */
    private void advanceToFeatures(JsonParser parser) throws IOException {
        while (parser.nextToken() != null) {
            if (JsonToken.FIELD_NAME.equals(parser.currentToken())
                    && "features".equals(parser.currentName())) {
                parser.nextToken(); // move to START_ARRAY
                return;
            }
        }
        throw new IOException("\"features\" array not found in GeoJSON");
    }

    // ── feature mapping ──────────────────────────────────────────

    private Neighborhood toNeighborhood(JsonNode feature) {
        JsonNode props = feature.get("properties");
        if (props == null || props.isNull()) {
            throw new IllegalArgumentException("feature has no properties");
        }

        String villCode   = textOrBlank(props, "VILLCODE");
        String countyName = textOrBlank(props, "COUNTYNAME");
        String townName   = textOrBlank(props, "TOWNNAME");
        String villName   = textOrBlank(props, "VILLNAME");
        String note       = textOrBlank(props, "NOTE");

        if (villCode.isBlank()) {
            throw new IllegalArgumentException("VILLCODE is blank");
        }

        boolean unassigned = UNASSIGNED_NOTE.equals(note.trim());
        String  name       = villName.isBlank() ? UNASSIGNED_NAME : villName;
        String  fullName   = countyName + townName + name;
        int     status     = unassigned ? 0 : 1;

        JsonNode geometry = feature.get("geometry");
        double[] centroid = computeCentroid(geometry);

        Neighborhood n = new Neighborhood();
        n.setLiCode(villCode);
        n.setName(name);
        n.setFullName(fullName);
        n.setCity(countyName);
        n.setDistrict(townName);
        n.setLat(BigDecimal.valueOf(centroid[0]).setScale(7, RoundingMode.HALF_UP));
        n.setLng(BigDecimal.valueOf(centroid[1]).setScale(7, RoundingMode.HALF_UP));
        n.setStatus(status);
        n.setBoundaryGeoJson(geometry != null && !geometry.isNull() ? geometry.toString() : null);
        return n;
    }

    // ── centroid computation ──────────────────────────────────────

    /**
     * Returns {@code [lat, lng]} centroid (WGS84).
     * Supports Polygon (exterior ring average) and MultiPolygon (largest ring by vertex count).
     */
    private double[] computeCentroid(JsonNode geom) {
        if (geom == null || geom.isNull()) {
            throw new IllegalArgumentException("geometry is null");
        }
        String   type   = geom.path("type").asText();
        JsonNode coords = geom.get("coordinates");
        return switch (type) {
            case "Polygon"      -> centroidOfPolygon(coords);
            case "MultiPolygon" -> centroidOfMultiPolygon(coords);
            default -> throw new IllegalArgumentException("unsupported geometry type: " + type);
        };
    }

    /** coords = [ exteriorRing, ...holes ] */
    private double[] centroidOfPolygon(JsonNode coords) {
        return ringCentroid(coords.get(0));
    }

    /** coords = [ polygon, ... ] — picks the exterior ring with the most vertices */
    private double[] centroidOfMultiPolygon(JsonNode coords) {
        JsonNode bestRing = null;
        int      bestSize = -1;
        for (JsonNode polygon : coords) {
            JsonNode ring = polygon.get(0); // exterior ring
            if (ring != null && ring.size() > bestSize) {
                bestSize = ring.size();
                bestRing = ring;
            }
        }
        if (bestRing == null) {
            throw new IllegalArgumentException("MultiPolygon has no rings");
        }
        return ringCentroid(bestRing);
    }

    /**
     * Averages ring coordinates.
     * GeoJSON coordinate order is [longitude, latitude], so index 0 = lng, index 1 = lat.
     *
     * @return [lat, lng]
     */
    private double[] ringCentroid(JsonNode ring) {
        if (ring == null || ring.isEmpty()) {
            throw new IllegalArgumentException("ring is empty");
        }
        double sumLat = 0, sumLng = 0;
        int    n      = ring.size();
        for (JsonNode pt : ring) {
            sumLng += pt.get(0).asDouble(); // GeoJSON: [lng, lat]
            sumLat += pt.get(1).asDouble();
        }
        return new double[]{sumLat / n, sumLng / n};
    }

    // ── helpers ──────────────────────────────────────────────────

    private String textOrBlank(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v == null || v.isNull()) ? "" : v.asText();
    }

    // ── cache invalidation ────────────────────────────────────────

    private void invalidateCache() {
        if (redisTemplate == null) return;
        deleteByPattern("neighborhood:list:*");
        deleteByPattern("neighborhood:detail:*");
        deleteByPattern("neighborhood:districts:*");
        redisTemplate.delete("neighborhood:cities");
    }

    private void deleteByPattern(String pattern) {
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
