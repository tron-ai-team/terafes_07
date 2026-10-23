package com.tronai.desktop.policy;

import java.util.regex.Pattern;

/**
 * Removes likely secrets from task output before it is stored or sent to the web console.
 */
public final class SecretRedactor {

    private static final Pattern[] PATTERNS = new Pattern[] {
            Pattern.compile("-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----"),
            Pattern.compile("\\beyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\b"),
            Pattern.compile("\\bAKIA[0-9A-Z]{16}\\b"),
            Pattern.compile("(?i)\\bbearer\\s+[A-Za-z0-9\\-._~+/]+=*"),
            Pattern.compile("(?i)\\b(api[_-]?key|secret|password|passwd|token|credential|approval[_-]?key)\\b\\s*[:=]\\s*\\S+"),
            Pattern.compile("(?i)\\b(authorization)\\b\\s*[:=]\\s*\\S+")
    };

    private SecretRedactor() {
    }

    public static String redact(String value) {
        if (value == null || value.isEmpty()) {
            return value;
        }
        String redacted = value;
        for (Pattern pattern : PATTERNS) {
            redacted = pattern.matcher(redacted).replaceAll("[REDACTED]");
        }
        return redacted;
    }

    public static String truncate(String value, int maxChars) {
        String redacted = redact(value);
        if (redacted == null || redacted.length() <= maxChars) {
            return redacted;
        }
        return redacted.substring(0, maxChars) + "\n[truncated]";
    }
}

