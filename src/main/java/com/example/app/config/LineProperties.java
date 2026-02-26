package com.example.app.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * LINE Login channel configuration.
 *
 * <p>Activate by setting the environment variables:
 * <pre>
 *   LINE_CHANNEL_ID=&lt;your channel id&gt;
 *   LINE_CHANNEL_SECRET=&lt;your channel secret&gt;
 * </pre>
 * then uncomment the {@code line} block in {@code application.yml}.
 */
@Data
@Component
@ConfigurationProperties(prefix = "line")
public class LineProperties {

    private String channelId;
    private String channelSecret;
    private String tokenEndpoint  = "https://api.line.me/oauth2/v2.1/token";
    private String verifyEndpoint = "https://api.line.me/oauth2/v2.1/verify";
}
