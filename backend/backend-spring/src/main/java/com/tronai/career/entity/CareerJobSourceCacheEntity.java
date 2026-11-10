package com.tronai.career.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "career_job_source_cache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareerJobSourceCacheEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_provider", nullable = false, length = 64)
    private String sourceProvider;

    @Column(name = "source_id", nullable = false, length = 255)
    private String sourceId;

    @Column(name = "source_url", nullable = false, length = 1024)
    private String sourceUrl;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, length = 512)
    private String company;

    @Column(length = 255)
    private String location;

    @Column(name = "employment_type", length = 100)
    private String employmentType;

    @Column(name = "description_text", columnDefinition = "LONGTEXT")
    private String descriptionText;

    @Column(name = "required_skills_json", columnDefinition = "LONGTEXT")
    private String requiredSkillsJson;

    @Column(name = "application_status", nullable = false, length = 40)
    private String applicationStatus;

    @Column(name = "international_student_policy", nullable = false, length = 40)
    private String internationalStudentPolicy;

    @Column(name = "new_graduate_eligible")
    private Boolean newGraduateEligible;

    @Column(name = "graduation_year", length = 32)
    private String graduationYear;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "last_verified_at", nullable = false)
    private Instant lastVerifiedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (applicationStatus == null) applicationStatus = "UNKNOWN";
        if (internationalStudentPolicy == null) internationalStudentPolicy = "UNKNOWN";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
