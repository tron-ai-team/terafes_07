package com.tronai.career.entity;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "career_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareerJobEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "run_id", length = 36)
    private String runId;

    @Column(name = "source_provider", nullable = false, length = 64)
    private String sourceProvider;

    @Column(name = "source_id", length = 255)
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

    @Column(name = "new_graduate_eligible")
    private Boolean newGraduateEligible;

    @Column(name = "japanese_requirement", length = 255)
    private String japaneseRequirement;

    @Column(name = "education_requirement", length = 512)
    private String educationRequirement;

    @Column(name = "experience_requirement", length = 512)
    private String experienceRequirement;

    @Column(name = "visa_support", length = 100)
    private String visaSupport;

    @Column(length = 255)
    private String salary;

    @Column(name = "required_skills_json", columnDefinition = "LONGTEXT")
    private String requiredSkillsJson;

    @Column(name = "description_text", columnDefinition = "LONGTEXT")
    private String descriptionText;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
