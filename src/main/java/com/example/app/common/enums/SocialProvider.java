package com.example.app.common.enums;

import com.example.app.common.exception.BusinessException;
import com.example.app.common.result.ResultCode;

/**
 * Social identity providers supported by Firebase Authentication.
 * Provider strings come from the {@code firebase.sign_in_provider} claim
 * inside a Firebase ID token.
 */
public enum SocialProvider {

    GOOGLE,
    APPLE,
    FACEBOOK,
    LINE,
    PHONE;

    /**
     * Maps a raw {@code sign_in_provider} value from a Firebase token to a
     * {@link SocialProvider}.
     *
     * @throws BusinessException (400) for unsupported or {@code null} providers
     */
    public static SocialProvider fromFirebaseProvider(String raw) {
        if (raw == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST,
                    "Missing sign_in_provider in Firebase token");
        }
        return switch (raw) {
            case "google.com"   -> GOOGLE;
            case "apple.com"    -> APPLE;
            case "facebook.com" -> FACEBOOK;
            case "oidc.line"    -> LINE;
            case "phone"        -> PHONE;
            default -> throw new BusinessException(ResultCode.BAD_REQUEST,
                    "Unsupported social provider: " + raw);
        };
    }
}
