package com.example.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEventMessage {

    private String  eventType;
    private Long    userId;
    private String  provider;   // null for guest
    private Boolean isGuest;
    private String  deviceId;
    private String  ip;
    private String  traceId;
    private Instant occurredAt;
}
