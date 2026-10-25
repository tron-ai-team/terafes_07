# One-off generator for com.tronai.career package (run from repo root)
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src/main/java/com/tronai/career"

FILES = {}

FILES["entity/CareerSearchRunEntity.java"] = r'''package com.tronai.career.entity;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "career_search_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareerSearchRunEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "request_json", columnDefinition = "LONGTEXT", nullable = false)
    private String requestJson;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "steps_json", columnDefinition = "LONGTEXT")
    private String stepsJson;

    @Column(name = "metrics_json", columnDefinition = "LONGTEXT")
    private String metricsJson;

    @Column(name = "blocked_reason", length = 512)
    private String blockedReason;

    @Column(name = "error_message", length = 1024)
    private String errorMessage;

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String language = "en";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
'''

FILES["entity/CareerJobEntity.java"] = r'''package com.tronai.career.entity;

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
'''

FILES["entity/CareerJobSaveEntity.java"] = r'''package com.tronai.career.entity;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "career_job_saves")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareerJobSaveEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "job_id", nullable = false, length = 36)
    private String jobId;

    @Column(nullable = false)
    @Builder.Default
    private boolean saved = true;

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
'''

FILES["entity/CareerMatchEntity.java"] = r'''package com.tronai.career.entity;

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
'''

FILES["entity/JobApplicationEntity.java"] = r'''package com.tronai.career.entity;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "job_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplicationEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "job_id", length = 36)
    private String jobId;

    @Column(name = "cv_document_id")
    private Long cvDocumentId;

    @Column(name = "interview_session_id", length = 36)
    private String interviewSessionId;

    @Column(nullable = false, length = 512)
    private String company;

    @Column(nullable = false, length = 512)
    private String position;

    @Column(name = "source_url", length = 1024)
    private String sourceUrl;

    @Column(nullable = false, length = 40)
    private String status;

    @Column(name = "application_date")
    private LocalDate applicationDate;

    @Column(name = "next_action", length = 512)
    private String nextAction;

    @Column(name = "deadline_at")
    private Instant deadlineAt;

    @Column(name = "interview_at")
    private Instant interviewAt;

    @Column(columnDefinition = "LONGTEXT")
    private String notes;

    @Column(name = "reminder_json", columnDefinition = "LONGTEXT")
    private String reminderJson;

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
'''

FILES["entity/JobApplicationStatusHistoryEntity.java"] = r'''package com.tronai.career.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "job_application_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobApplicationStatusHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false, length = 36)
    private String applicationId;

    @Column(name = "from_status", length = 40)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 40)
    private String toStatus;

    @Column(length = 1024)
    private String note;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    @PrePersist
    void onCreate() {
        if (changedAt == null) {
            changedAt = Instant.now();
        }
    }
}
'''

FILES["entity/CareerOpsCheckpointEntity.java"] = r'''package com.tronai.career.entity;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "career_ops_checkpoints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CareerOpsCheckpointEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64)
    private String provider;

    @Column(name = "source_id", nullable = false, length = 255)
    private String sourceId;

    @Column(name = "checkpoint_key", nullable = false, length = 128)
    private String checkpointKey;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "payload_json", columnDefinition = "LONGTEXT")
    private String payloadJson;

    @Column(name = "last_error", length = 1024)
    private String lastError;

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
'''

for rel, content in FILES.items():
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print("wrote", rel)

print("entities done")
