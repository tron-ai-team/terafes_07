package com.tronai.career.entity;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "career_matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareerMatchEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "cv_document_id", nullable = false)
    private Long cvDocumentId;

    @Column(name = "job_id", nullable = false, length = 36)
    private String jobId;

    @Column(name = "match_score", nullable = false)
    private int matchScore;

    @Column(name = "match_tier", nullable = false, length = 16)
    private String matchTier;

    @Column(name = "mandatory_blockers_json", columnDefinition = "LONGTEXT")
    private String mandatoryBlockersJson;

    @Column(name = "matched_skills_json", columnDefinition = "LONGTEXT")
    private String matchedSkillsJson;

    @Column(name = "missing_skills_json", columnDefinition = "LONGTEXT")
    private String missingSkillsJson;

    @Column(name = "strengths_json", columnDefinition = "LONGTEXT")
    private String strengthsJson;

    @Column(name = "gaps_json", columnDefinition = "LONGTEXT")
    private String gapsJson;

    @Column(name = "reasons_json", columnDefinition = "LONGTEXT")
    private String reasonsJson;

    @Column(name = "improvements_json", columnDefinition = "LONGTEXT")
    private String improvementsJson;

    @Column(name = "rubric_json", columnDefinition = "LONGTEXT")
    private String rubricJson;

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String language = "en";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
