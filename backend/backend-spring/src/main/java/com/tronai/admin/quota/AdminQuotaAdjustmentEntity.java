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
@Table(name = "admin_quota_adjustments")
@Getter
@Setter
public class AdminQuotaAdjustmentEntity {

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
    private int adjustment;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
