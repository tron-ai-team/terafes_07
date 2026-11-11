package com.tronai.admin.security;

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
@Table(name = "admin_user_invitations")
@Getter
@Setter
public class AdminUserInvitationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "role_name", nullable = false, length = 30)
    private String roleName = "USER";

    @Column(name = "token_hash", nullable = false, length = 128)
    private String tokenHash;

    @Column(nullable = false, length = 32)
    private String status = "PENDING";

    @Column(length = 500)
    private String note;

    @Column(name = "invited_by")
    private Long invitedBy;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
