package com.example.app.messaging;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.UserEventMessage;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;

/**
 * TX-safe RabbitMQ producer. Registers an afterCommit hook when called inside a
 * transaction; sends immediately otherwise. {@link RabbitTemplate} is injected
 * optionally so the bean is always available even when RabbitMQ is absent (e.g. tests).
 */
@Slf4j
@Component
public class UserEventProducer {

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    public void publishGuestCreated(Long userId, Long neighborhoodId,
                                    String deviceId, Instant occurredAt) {
        UserEventMessage msg = UserEventMessage.builder()
                .eventType("user.guest.created")
                .userId(userId)
                .isGuest(true)
                .deviceId(deviceId)
                .traceId(MDC.get("traceId"))
                .occurredAt(occurredAt)
                .build();
        sendAfterCommit("user.guest.created", msg);
    }

    // ── internal ─────────────────────────────────────────────

    private void sendAfterCommit(String routingKey, UserEventMessage message) {
        if (rabbitTemplate == null) return;

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            doSend(routingKey, message);
                        }
                    });
        } else {
            doSend(routingKey, message);
        }
    }

    private void doSend(String routingKey, UserEventMessage message) {
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.USER_EVENTS_EXCHANGE, routingKey, message);
            log.debug("Published {} for userId={}", routingKey, message.getUserId());
        } catch (Exception e) {
            log.error("Failed to publish {} for userId={}", routingKey, message.getUserId(), e);
        }
    }
}
