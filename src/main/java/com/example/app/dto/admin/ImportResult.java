package com.example.app.dto.admin;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ImportResult {

    private int successCount;
    private int failureCount;
    private List<CsvRowError> errors;
}
