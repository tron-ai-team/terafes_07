package com.tronai.admin.quota;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "ai_feature_quota_reservations")
@Getter
@Setter
public class AiFeatureQuotaReservationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 64)
    private String meter;

    @Column(name = "quota_day", nullable = false)
    private LocalDate quotaDay;

    @Column(nullable = false)
    private int units = 1;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "mode_at_reserve", nullable = false, length = 32)
    private String modeAtReserve;

    @Column(name = "idempotency_key", nullable = false, length = 128)
    private String idempotencyKey;

    @Column(name = "request_id", nullable = false, length = 64)
    private String requestId;

    @Column(length = 64)
    private String feature;

    @Column(length = 64)
    private String provider;

    @Column(name = "model_id", length = 128)
    private String modelId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "settled_at")
    private Instant settledAt;
}
