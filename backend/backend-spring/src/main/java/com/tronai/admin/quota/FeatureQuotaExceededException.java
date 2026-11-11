package com.tronai.admin.quota;

import com.tronai.ai.gateway.AiFeature;
import lombok.Getter;

import java.time.Instant;

@Getter
public class FeatureQuotaExceededException extends RuntimeException {

    public static final String CODE = "FEATURE_QUOTA_EXCEEDED";

    private final String code;
    private final AiFeature feature;
    private final AdminQuotaMeter meter;
    private final int limit;
    private final int used;
    private final int remaining;
    private final Instant resetAt;

    public FeatureQuotaExceededException(
            AiFeature feature,
            AdminQuotaMeter meter,
            int limit,
            int used,
            int remaining,
            Instant resetAt) {
        super("Daily feature quota exceeded for " + meter.name());
        this.code = CODE;
        this.feature = feature;
        this.meter = meter;
        this.limit = limit;
        this.used = used;
        this.remaining = remaining;
        this.resetAt = resetAt;
    }
}
