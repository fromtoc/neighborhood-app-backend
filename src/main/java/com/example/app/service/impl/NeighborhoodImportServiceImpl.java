package com.example.app.service.impl;

import com.example.app.dto.admin.CsvRowError;
import com.example.app.dto.admin.ImportResult;
import com.example.app.entity.Neighborhood;
import com.example.app.mapper.NeighborhoodMapper;
import com.example.app.service.NeighborhoodImportService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NeighborhoodImportServiceImpl implements NeighborhoodImportService {

    private static final int BATCH_SIZE  = 500;
    private static final int MAX_ERRORS  = 20;

    private final NeighborhoodMapper neighborhoodMapper;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    @Override
    public ImportResult importCsv(InputStream in) {
        List<CsvRowError> errors      = new ArrayList<>();
        List<Neighborhood> batch      = new ArrayList<>(BATCH_SIZE);
        int successCount = 0;
        int failureCount = 0;

        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("city_code", "district_code", "li_code", "name",
                           "full_name", "lat", "lng", "status")
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setTrim(true)
                .build();

        try (CSVParser parser = format.parse(
                new InputStreamReader(in, StandardCharsets.UTF_8))) {

            for (CSVRecord record : parser) {
                int rowNum = (int) record.getRecordNumber() + 1; // +1: header was row 1

                try {
                    Neighborhood n = parseRow(record);
                    batch.add(n);

                    if (batch.size() >= BATCH_SIZE) {
                        successCount += upsertBatch(batch);
                        batch.clear();
                    }
                } catch (IllegalArgumentException e) {
                    failureCount++;
                    if (errors.size() < MAX_ERRORS) {
                        errors.add(new CsvRowError(rowNum, e.getMessage()));
                    }
                }
            }

            // flush remainder
            if (!batch.isEmpty()) {
                successCount += upsertBatch(batch);
            }

        } catch (IOException e) {
            throw new RuntimeException("Failed to parse CSV: " + e.getMessage(), e);
        }

        if (successCount > 0) {
            invalidateCache();
        }

        return ImportResult.builder()
                .successCount(successCount)
                .failureCount(failureCount)
                .errors(errors)
                .build();
    }

    @Transactional
    protected int upsertBatch(List<Neighborhood> batch) {
        neighborhoodMapper.batchUpsert(batch);
        return batch.size();
    }

    // ── parsing & validation ──────────────────────────────────────

    private Neighborhood parseRow(CSVRecord r) {
        String liCode   = r.get("li_code");
        String name     = r.get("name");
        String fullName = r.get("full_name");
        String city     = r.get("city_code");
        String district = r.get("district_code");
        String latStr   = r.get("lat");
        String lngStr   = r.get("lng");
        String statusStr = r.get("status");

        if (liCode == null || liCode.isBlank()) {
            throw new IllegalArgumentException("li_code is required");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name is required");
        }

        int status;
        try {
            status = Integer.parseInt(statusStr);
            if (status != 0 && status != 1) throw new NumberFormatException();
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("status must be 0 or 1, got: " + statusStr);
        }

        BigDecimal lat = null;
        BigDecimal lng = null;
        if (latStr != null && !latStr.isBlank()) {
            try { lat = new BigDecimal(latStr); }
            catch (NumberFormatException e) {
                throw new IllegalArgumentException("lat is not a valid decimal: " + latStr);
            }
        }
        if (lngStr != null && !lngStr.isBlank()) {
            try { lng = new BigDecimal(lngStr); }
            catch (NumberFormatException e) {
                throw new IllegalArgumentException("lng is not a valid decimal: " + lngStr);
            }
        }

        Neighborhood n = new Neighborhood();
        n.setLiCode(liCode);
        n.setName(name);
        n.setFullName(fullName != null && !fullName.isBlank() ? fullName : null);
        n.setCity(city);
        n.setDistrict(district);
        n.setLat(lat);
        n.setLng(lng);
        n.setStatus(status);
        return n;
    }

    // ── cache invalidation ────────────────────────────────────────

    private void invalidateCache() {
        if (redisTemplate == null) return;
        deleteByPattern("neighborhood:list:*");
        deleteByPattern("neighborhood:detail:*");
    }

    private void deleteByPattern(String pattern) {
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
