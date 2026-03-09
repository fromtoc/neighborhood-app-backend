package com.example.app;

import jakarta.annotation.PostConstruct;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@MapperScan("com.example.app.mapper")
@EnableAsync
@EnableScheduling
public class Application {

    @PostConstruct
    void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Taipei"));
    }

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
