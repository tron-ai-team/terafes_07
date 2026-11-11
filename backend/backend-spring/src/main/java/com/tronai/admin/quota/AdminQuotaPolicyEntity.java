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

@Entity
@Table(name = "admin_quota_policies")
@Getter
@Setter
public class AdminQuotaPolicyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String meter;

    @Column(nullable = false, length = 32)
    private String scope;

    @Column(name = "role_name", length = 30)
    private String roleName;

    @Column(name = "daily_limit", nullable = false)
    private int dailyLimit;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false, length = 32)
    private String mode = AdminQuotaMode.OBSERVE.name();

    @Column(nullable = false, length = 64)
    private String timezone = "Asia/Tokyo";

    @Column(nullable = false)
    private int revision = 1;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
