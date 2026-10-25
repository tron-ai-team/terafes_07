package com.tronai.career.entity;

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
