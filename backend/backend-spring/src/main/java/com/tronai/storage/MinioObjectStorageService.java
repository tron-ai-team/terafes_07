package com.tronai.storage;

import io.minio.*;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Service
@Profile("!test")
public class MinioObjectStorageService implements ObjectStorageService {

    private static final Logger log = LoggerFactory.getLogger(MinioObjectStorageService.class);

    private final LocalFilesystemObjectStorageService localFallback;

    @Value("${MINIO_ENDPOINT:${minio.endpoint:http://127.0.0.1:9000}}")
    private String endpoint;

    @Value("${MINIO_ACCESS_KEY:${minio.access-key:minioadmin}}")
    private String accessKey;

    @Value("${MINIO_SECRET_KEY:${minio.secret-key:minioadmin}}")
    private String secretKey;

    @Value("${MINIO_BUCKET:${minio.bucket:tron-ai-private}}")
    private String bucket;

    private MinioClient minioClient;
    private volatile boolean available = false;

    public MinioObjectStorageService(LocalFilesystemObjectStorageService localFallback) {
        this.localFallback = localFallback;
    }

    @PostConstruct
    public void init() {
        try {
            this.minioClient = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
            ensureBucketExists();
        } catch (Exception e) {
            log.warn("MinIO initialization deferred or unavailable at {}: {}", endpoint, e.getMessage());
            this.available = false;
        }
    }

    @Override
    public synchronized void ensureBucketExists() {
        if (minioClient == null) {
            return;
        }
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                log.info("Creating private MinIO bucket: {}", bucket);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
            this.available = true;
        } catch (Exception e) {
            log.warn("MinIO bucket check failed for {}: {}", bucket, e.getMessage());
            this.available = false;
        }
    }

    @Override
    public void putObject(String objectKey, byte[] data, String contentType) {
        if (tryMinioPut(objectKey, data, contentType)) {
            return;
        }
        log.warn("MinIO unavailable; storing object {} on local filesystem fallback", objectKey);
        localFallback.putObject(objectKey, data, contentType);
    }

    @Override
    public byte[] getObject(String objectKey) {
        if (minioClient != null) {
            try (InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build())) {
                this.available = true;
                return stream.readAllBytes();
            } catch (Exception e) {
                this.available = false;
                log.warn("MinIO get failed for {}; trying local fallback: {}", objectKey, e.getMessage());
            }
        }
        return localFallback.getObject(objectKey);
    }

    @Override
    public void deleteObject(String objectKey) {
        if (minioClient != null) {
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(bucket)
                                .object(objectKey)
                                .build()
                );
            } catch (Exception e) {
                log.warn("Failed to delete object {} from MinIO: {}", objectKey, e.getMessage());
            }
        }
        localFallback.deleteObject(objectKey);
    }

    @Override
    public boolean isAvailable() {
        if (minioClient != null) {
            try {
                minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
                this.available = true;
                return true;
            } catch (Exception e) {
                this.available = false;
            }
        }
        return localFallback.isAvailable();
    }

    private boolean tryMinioPut(String objectKey, byte[] data, String contentType) {
        if (minioClient == null) {
            return false;
        }
        try (ByteArrayInputStream bais = new ByteArrayInputStream(data)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(bais, data.length, -1)
                            .contentType(contentType != null ? contentType : "application/octet-stream")
                            .build()
            );
            this.available = true;
            return true;
        } catch (Exception e) {
            this.available = false;
            return false;
        }
    }

    public String getBucket() {
        return bucket;
    }
}
