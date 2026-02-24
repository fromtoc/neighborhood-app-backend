package com.example.app.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CsvRowError {

    private int row;
    private String message;
}
