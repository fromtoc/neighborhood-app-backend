package com.example.app.controller;

import com.example.app.common.result.ApiResponse;
import com.example.app.config.R2Config;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
@Tag(name = "Image", description = "圖片上傳")
public class ImageUploadController {

    private static final long MAX_SIZE = 10 * 1024 * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private final R2Config r2Config;

    @Value("${app.upload.dir:${user.home}/uploads}")
    private String uploadDir;

    @Value("${app.upload.base-url:/uploads}")
    private String uploadBaseUrl;

    // 在 @PostConstruct 裡建立，不依賴 Spring Bean
    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (r2Config.isConfigured()) {
            try {
                String endpoint = "https://" + r2Config.getAccountId().trim() + ".r2.cloudflarestorage.com";
                s3Client = S3Client.builder()
                        .endpointOverride(URI.create(endpoint))
                        .region(Region.of("auto"))
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(
                                        r2Config.getAccessKeyId().trim(),
                                        r2Config.getSecretAccessKey().trim()
                                )
                        ))
                        .build();
                log.info("ImageUpload: using Cloudflare R2, bucket={}", r2Config.getBucket());
            } catch (Exception e) {
                log.warn("ImageUpload: R2 init failed ({}), falling back to local storage", e.getMessage());
                s3Client = null;
            }
        } else {
            log.info("ImageUpload: R2 not configured, using local storage ({})", uploadDir);
        }
    }

    @PostMapping("/upload")
    @Operation(summary = "上傳圖片", security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<String> upload(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return ApiResponse.fail(400, "檔案不得為空");
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ApiResponse.fail(400, "僅支援 JPEG / PNG / GIF / WebP");
        }
        if (file.getSize() > MAX_SIZE) {
            return ApiResponse.fail(400, "圖片大小不得超過 10 MB");
        }

        String ext = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png"  -> ".png";
            case "image/gif"  -> ".gif";
            case "image/webp" -> ".webp";
            default           -> ".bin";
        };
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        try {
            String url = (s3Client != null)
                    ? uploadToR2(file, filename, contentType)
                    : uploadToLocal(file, filename);
            log.info("Image uploaded: {}", url);
            return ApiResponse.success(url);
        } catch (Exception e) {
            log.error("Image upload failed", e);
            return ApiResponse.fail(500, "上傳失敗：" + e.getMessage());
        }
    }

    private String uploadToR2(MultipartFile file, String filename, String contentType) throws Exception {
        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(r2Config.getBucket())
                .key(filename)
                .contentType(contentType)
                .contentLength(file.getSize())
                .build();
        s3Client.putObject(req, RequestBody.fromBytes(file.getBytes()));
        String base = r2Config.getPublicBaseUrl().endsWith("/")
                ? r2Config.getPublicBaseUrl()
                : r2Config.getPublicBaseUrl() + "/";
        return base + filename;
    }

    private String uploadToLocal(MultipartFile file, String filename) throws Exception {
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        file.transferTo(dir.resolve(filename));
        String base = uploadBaseUrl.endsWith("/") ? uploadBaseUrl : uploadBaseUrl + "/";
        return base + filename;
    }
}
