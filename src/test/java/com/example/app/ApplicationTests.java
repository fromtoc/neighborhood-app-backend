package com.example.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring context starts without errors.
        // Uses H2 in-memory DB (see src/test/resources/application.yml).
    }
}
