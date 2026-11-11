package com.tronai.admin;

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
@Table(name = "admin_audit_logs")
@Getter
@Setter
public class AdminAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(nullable = false, length = 120)
    private String action;

    @Column(name = "target_type", length = 80)
    private String targetType;

    @Column(name = "target_id", length = 120)
    private String targetId;

    @Column(columnDefinition = "LONGTEXT")
    private String detail;

    @Column(name = "result_status", length = 32)
    private String resultStatus;

    @Column(name = "request_id", length = 64)
    private String requestId;

    @Column(name = "actor_role", length = 30)
    private String actorRole;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
