package com.example.app.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;

/**
 * Initialises the Firebase Admin SDK.
 *
 * <p>Activated only when {@code app.firebase.credentials-path} is set.
 * The recommended pattern is to point it to the service-account JSON via an
 * environment variable — for example:
 *
 * <pre>
 * # application.yml (dev override or prod config)
 * app:
 *   firebase:
 *     credentials-path: ${FIREBASE_CREDENTIALS_PATH}   # full file-system path
 * </pre>
 *
 * <strong>Never commit the service-account JSON file to the repository.</strong>
 */
@Slf4j
@Configuration
@ConditionalOnProperty(name = "app.firebase.credentials-path")
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp(
            @Value("${app.firebase.credentials-path}") String credentialsPath,
            ResourceLoader resourceLoader) throws IOException {

        // Re-use an already-initialised app (e.g. when context is refreshed in tests)
        if (!FirebaseApp.getApps().isEmpty()) {
            log.debug("FirebaseApp already initialised — reusing existing instance");
            return FirebaseApp.getInstance();
        }

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(resourceLoader.getResource(credentialsPath).getInputStream());

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        FirebaseApp app = FirebaseApp.initializeApp(options);
        log.info("FirebaseApp initialised (credentials: {})", credentialsPath);
        return app;
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
