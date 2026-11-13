package com.tronai.admin.quota;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "ai_feature_daily_counters")
@Getter
@Setter
public class AiFeatureDailyCounterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 64)
    private String meter;

    @Column(name = "quota_day", nullable = false)
    private LocalDate quotaDay;

    @Column(nullable = false, length = 64)
    private String timezone = "Asia/Tokyo";

    @Column(name = "reserved_count", nullable = false)
    private int reservedCount;

    @Column(name = "settled_count", nullable = false)
    private int settledCount;

    @Column(name = "denied_count", nullable = false)
    private int deniedCount;

    @Column(name = "observe_would_block_count", nullable = false)
    private int observeWouldBlockCount;

    @Version
    @Column(nullable = false)
    private int version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
