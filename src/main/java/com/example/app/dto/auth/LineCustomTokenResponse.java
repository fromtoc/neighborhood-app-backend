package com.example.app.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LineCustomTokenResponse {

    private String firebaseCustomToken;
}
