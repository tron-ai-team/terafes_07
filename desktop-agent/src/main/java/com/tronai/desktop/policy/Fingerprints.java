package com.tronai.desktop.policy;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

/**
 * Approval binding. A grant for one command or path cannot be replayed for another.
 */
public final class Fingerprints {

    private Fingerprints() {
    }

    public static String of(String tool, String operation, String workingDirectory, String path,
                            String destination, List<String> argv, String content, String url) {
        StringBuilder raw = new StringBuilder();
        raw.append(norm(tool)).append('\n');
        raw.append(norm(operation)).append('\n');
        raw.append(norm(workingDirectory)).append('\n');
        raw.append(norm(path)).append('\n');
        raw.append(norm(destination)).append('\n');
        raw.append(norm(url)).append('\n');
        if (argv != null) {
            for (String arg : argv) {
                raw.append(arg == null ? "" : arg).append('\n');
            }
        }
        raw.append(content == null ? "" : sha256(content));
        return sha256(raw.toString());
    }

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public static String sha256(byte[] value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String norm(String value) {
        return value == null ? "" : value.trim().replace('\\', '/').toLowerCase(Locale.ROOT);
    }
}

