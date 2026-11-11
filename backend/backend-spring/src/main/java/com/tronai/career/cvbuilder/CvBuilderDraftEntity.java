package com.tronai.career.cvbuilder;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "cv_builder_drafts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CvBuilderDraftEntity {
    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "profile_id")
    private Long profileId;

    @Column(name = "template_code", nullable = false, length = 40)
    private String templateCode;

    @Column(name = "version_label", length = 100)
    private String versionLabel;

    @Column(nullable = false, length = 32)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "payload_json", columnDefinition = "LONGTEXT", nullable = false)
    private String payloadJson;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private boolean primary = false;

    @Column(name = "source_cv_document_id")
    private Long sourceCvDocumentId;

    /** Soft-delete timestamp; null = active. Never deletes Candidate Profile. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        // Truncate to seconds to match MySQL TIMESTAMP (no fractional seconds)
        // and keep optimistic-concurrency tokens stable across JSON round-trips.
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        // Guarantee the concurrency token advances even when two saves land
        // within the same wall-clock second (MySQL TIMESTAMP has no fractions).
        if (updatedAt != null && !now.isAfter(updatedAt)) {
            updatedAt = updatedAt.plusSeconds(1);
        } else {
            updatedAt = now;
        }
    }
}
