package com.example.app.dto.firebase;

import com.example.app.common.enums.SocialProvider;
import lombok.Builder;
import lombok.Getter;

/**
 * Parsed result of a Firebase ID token verification.
 * All optional fields ({@code email}, {@code name}, {@code picture}) may be
 * {@code null} depending on the provider and user's profile settings.
 */
@Getter
@Builder
public class FirebasePrincipal {

    /** Firebase UID — stable, provider-independent user identifier. */
    private final String uid;

    /** Resolved social provider. */
    private final SocialProvider provider;

    /** User's email address, or {@code null} if not shared by the provider. */
    private final String email;

    /** User's display name, or {@code null} if not provided. */
    private final String name;

    /** URL of the user's profile picture, or {@code null} if not provided. */
    private final String picture;
}
