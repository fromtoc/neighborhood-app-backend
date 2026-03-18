package com.example.app.dto;

import com.example.app.common.enums.TokenType;
import com.example.app.common.enums.UserRole;
import lombok.Builder;
import lombok.Getter;

import java.util.Date;

@Getter
@Builder
public class JwtClaims {
    private Long userId;
    private UserRole role;
    private Long defaultNeighborhoodId; // nullable
    private Long chiefNeighborhoodId;   // nullable, 里長管理的里 ID
    private String jti;
    private TokenType tokenType;
    private Date issuedAt;
    private Date expiration;
}
