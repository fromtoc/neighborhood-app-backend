package com.example.app.messaging;

import com.example.app.config.RabbitMQConfig;
import com.example.app.dto.UserEventMessage;
import com.example.app.entity.UserLoginLog;
import com.example.app.mapper.UserLoginLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnBean(ConnectionFactory.class)
@RequiredArgsConstructor
public class UserEventConsumer {

    private final UserLoginLogMapper userLoginLogMapper;

    @RabbitListener(queues = RabbitMQConfig.USER_EVENTS_QUEUE)
    public void onUserEvent(UserEventMessage message) {
        if (message.getTraceId() != null) {
            MDC.put("traceId", message.getTraceId());
        }
        try {
            log.info("event={} userId={} provider={} isGuest={} deviceId={} ip={}",
                    message.getEventType(),
                    message.getUserId(),
                    message.getProvider(),
                    message.getIsGuest(),
                    message.getDeviceId(),
                    message.getIp());

            UserLoginLog logEntry = new UserLoginLog();
            logEntry.setUserId(message.getUserId());
            logEntry.setProvider(message.getProvider());
            logEntry.setDeviceId(message.getDeviceId());
            logEntry.setIp(message.getIp());
            logEntry.setIsGuest(Boolean.TRUE.equals(message.getIsGuest()) ? 1 : 0);
            userLoginLogMapper.insert(logEntry);

        } finally {
            MDC.remove("traceId");
        }
    }
}
