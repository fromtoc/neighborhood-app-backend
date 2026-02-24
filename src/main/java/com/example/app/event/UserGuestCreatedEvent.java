package com.example.app.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor
public class UserGuestCreatedEvent {
    private Long userId;
    private Long neighborhoodId;
    private String deviceId;
    private Instant occurredAt;
}
