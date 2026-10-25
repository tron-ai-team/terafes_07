package com.tronai.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/**
 * Durable on-disk object storage for development when MinIO is unavailable.
 */
@Service
@Profile("!test")
public class LocalFilesystemObjectStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalFilesystemObjectStorageService.class);

    private final Path root;

    public LocalFilesystemObjectStorageService(
            @Value("${tron.storage.local.path:${user.home}/.tron-ai/object-storage}") String rootPath) {
        this.root = Path.of(rootPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create local object storage directory: " + this.root, e);
        }
        log.info("Local filesystem object storage root: {}", this.root);
    }

    public void putObject(String objectKey, byte[] data, String contentType) {
        Path target = resolve(objectKey);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, data == null ? new byte[0] : data,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store object locally: " + e.getMessage(), e);
        }
    }

    public byte[] getObject(String objectKey) {
        Path target = resolve(objectKey);
        try {
            if (!Files.isRegularFile(target)) {
                throw new IllegalStateException("Object not found: " + objectKey);
            }
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read local object: " + e.getMessage(), e);
        }
    }

    public void deleteObject(String objectKey) {
        Path target = resolve(objectKey);
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Failed to delete local object {}: {}", objectKey, e.getMessage());
        }
    }

    public boolean isAvailable() {
        return Files.isDirectory(root) && Files.isWritable(root);
    }

    private Path resolve(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("objectKey is required");
        }
        Path normalized = root.resolve(objectKey.replace("\\", "/")).normalize();
        if (!normalized.startsWith(root)) {
            throw new IllegalArgumentException("Invalid object key");
        }
        return normalized;
    }
}
