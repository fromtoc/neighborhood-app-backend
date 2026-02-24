package com.example.app.service;

import com.example.app.dto.admin.ImportResult;

import java.io.InputStream;

public interface NeighborhoodImportService {

    ImportResult importCsv(InputStream in);
}
