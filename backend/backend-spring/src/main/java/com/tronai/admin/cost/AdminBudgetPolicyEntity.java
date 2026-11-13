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
@Table(name = "admin_budget_policies")
@Getter
@Setter
public class AdminBudgetPolicyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String scope = "GLOBAL";

    @Column(nullable = false, columnDefinition = "CHAR(3)")
    private String currency = "USD";

    @Column(name = "monthly_limit")
    private BigDecimal monthlyLimit;

    @Column(name = "warn_pct", nullable = false)
    private int warnPct = 80;

    @Column(name = "critical_pct", nullable = false)
    private int criticalPct = 95;

    @Column(nullable = false, length = 32)
    private String mode = "OBSERVE";

    @Column(nullable = false)
    private boolean enabled = false;

    @Column(nullable = false)
    private int revision = 1;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
