package com.tronai.admin.quota;

public enum AdminQuotaMode {
    OBSERVE,
    ENFORCE;

    public static AdminQuotaMode fromDb(String value) {
        if (value == null || value.isBlank()) {
            return OBSERVE;
        }
        return AdminQuotaMode.valueOf(value.trim().toUpperCase());
    }
}
