package com.tronai.career.entity;

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
