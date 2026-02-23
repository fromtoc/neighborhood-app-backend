package com.example.app.service;

import com.example.app.common.enums.UserRole;
import com.example.app.dto.JwtClaims;
import com.example.app.dto.TokenPair;

import java.util.Date;

public interface JwtService {

    TokenPair generateTokenPair(Long userId, UserRole role, Long defaultNeighborhoodId);

    JwtClaims parseToken(String token);

    void blacklistToken(String jti, Date expiration);

    boolean isBlacklisted(String jti);
}
