package com.example.app.service;

import com.example.app.dto.admin.ImportResult;

import java.io.InputStream;

public interface NeighborhoodGeoJsonImportService {

    /**
     * Parses a GeoJSON FeatureCollection (NLSC village boundary format) and
     * bulk-upserts all features into the {@code neighborhood} table.
     *
     * <p>Field mapping from NLSC:
     * <pre>
     *   VILLCODE              → liCode  (unique upsert key)
     *   COUNTYNAME            → city
     *   TOWNNAME              → district
     *   VILLNAME              → name    (fallback "未編定" when blank)
     *   COUNTY+TOWN+VILLNAME  → fullName
     *   geometry centroid     → lat / lng  (WGS84)
     *   NOTE == "未編定村里"   → status=0, otherwise status=1
     * </pre>
     */
    ImportResult importGeoJson(InputStream in);
}
