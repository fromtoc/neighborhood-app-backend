package com.example.app.messaging;

import com.example.app.dto.UserEventMessage;
import com.example.app.entity.UserLoginLog;
import com.example.app.mapper.UserLoginLogMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserEventConsumerTest {

    @Mock  UserLoginLogMapper userLoginLogMapper;
    @InjectMocks UserEventConsumer consumer;

    // ── user.guest.created ───────────────────────────────────

    @Test
    void onUserEvent_guestCreated_writesLogWithIsGuest1() {
        UserEventMessage msg = UserEventMessage.builder()
                .eventType("user.guest.created")
                .userId(1L)
                .provider(null)
                .isGuest(true)
                .deviceId("device-abc")
                .ip("1.2.3.4")
                .occurredAt(Instant.now())
                .build();

        consumer.onUserEvent(msg);

        ArgumentCaptor<UserLoginLog> captor = ArgumentCaptor.forClass(UserLoginLog.class);
        verify(userLoginLogMapper).insert(captor.capture());

        UserLoginLog logged = captor.getValue();
        assertThat(logged.getUserId()).isEqualTo(1L);
        assertThat(logged.getProvider()).isNull();
        assertThat(logged.getDeviceId()).isEqualTo("device-abc");
        assertThat(logged.getIp()).isEqualTo("1.2.3.4");
        assertThat(logged.getIsGuest()).isEqualTo(1);
    }

    // ── user.login ───────────────────────────────────────────

    @Test
    void onUserEvent_login_writesLogWithIsGuest0AndProvider() {
        UserEventMessage msg = UserEventMessage.builder()
                .eventType("user.login")
                .userId(42L)
                .provider("GOOGLE")
                .isGuest(false)
                .deviceId("device-xyz")
                .ip("10.0.0.1")
                .occurredAt(Instant.now())
                .build();

        consumer.onUserEvent(msg);

        ArgumentCaptor<UserLoginLog> captor = ArgumentCaptor.forClass(UserLoginLog.class);
        verify(userLoginLogMapper).insert(captor.capture());

        UserLoginLog logged = captor.getValue();
        assertThat(logged.getUserId()).isEqualTo(42L);
        assertThat(logged.getProvider()).isEqualTo("GOOGLE");
        assertThat(logged.getDeviceId()).isEqualTo("device-xyz");
        assertThat(logged.getIsGuest()).isEqualTo(0);
    }

    // ── user.registered ──────────────────────────────────────

    @Test
    void onUserEvent_registered_writesLogWithIsGuest0AndProvider() {
        UserEventMessage msg = UserEventMessage.builder()
                .eventType("user.registered")
                .userId(99L)
                .provider("APPLE")
                .isGuest(false)
                .deviceId(null)
                .ip("::1")
                .occurredAt(Instant.now())
                .build();

        consumer.onUserEvent(msg);

        ArgumentCaptor<UserLoginLog> captor = ArgumentCaptor.forClass(UserLoginLog.class);
        verify(userLoginLogMapper).insert(captor.capture());

        UserLoginLog logged = captor.getValue();
        assertThat(logged.getUserId()).isEqualTo(99L);
        assertThat(logged.getProvider()).isEqualTo("APPLE");
        assertThat(logged.getDeviceId()).isNull();
        assertThat(logged.getIp()).isEqualTo("::1");
        assertThat(logged.getIsGuest()).isEqualTo(0);
    }
}
