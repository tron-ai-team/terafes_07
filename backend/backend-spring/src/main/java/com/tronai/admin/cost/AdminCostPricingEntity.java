package com.tronai.admin.cost;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "admin_cost_pricing")
@Getter
@Setter
public class AdminCostPricingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String provider;

    @Column(name = "model_id", nullable = false, length = 128)
    private String modelId;

    @Column(nullable = false, columnDefinition = "CHAR(3)")
    private String currency = "USD";

    @Column(name = "input_per_1m")
    private BigDecimal inputPer1m;

    @Column(name = "output_per_1m")
    private BigDecimal outputPer1m;

    @Column(name = "stt_per_minute")
    private BigDecimal sttPerMinute;

    @Column(name = "tts_per_1k_chars")
    private BigDecimal ttsPer1kChars;

    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    @Column(name = "effective_to")
    private Instant effectiveTo;

    @Column(nullable = false, length = 64)
    private String source = "MANUAL";

    @Column(length = 500)
    private String notes;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
