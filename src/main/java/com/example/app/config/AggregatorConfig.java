package com.example.app.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.*;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

@Slf4j
@Configuration
public class AggregatorConfig {

    /**
     * 爬蟲用 RestTemplate：信任所有 SSL 憑證。
     * 台灣政府網站（CDC、台北市、水利署等）使用 GRCA 憑證，
     * 不在 JVM 預設 truststore 中，需繞過驗證。
     * 僅限爬取公開開放資料，不傳輸敏感資訊。
     */
    @Bean
    public RestTemplate restTemplate() {
        try {
            TrustManager[] trustAll = new TrustManager[]{
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                    public void checkClientTrusted(X509Certificate[] c, String a) {}
                    public void checkServerTrusted(X509Certificate[] c, String a) {}
                }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAll, new SecureRandom());

            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);

            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10_000);
            factory.setReadTimeout(30_000);

            return new RestTemplate(factory);
        } catch (Exception e) {
            log.warn("Failed to configure lenient SSL, using default RestTemplate", e);
            return new RestTemplate();
        }
    }
}
