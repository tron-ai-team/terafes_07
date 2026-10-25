package com.tronai.interview;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interview_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSessionEntity implements org.springframework.data.domain.Persistable<String> {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.isNew = false;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "cv_document_id")
    private Long cvDocumentId;

    @Column(name = "job_id", length = 36)
    private String jobId;

    @Column(name = "company_analysis_id", length = 36)
    private String companyAnalysisId;

    @Column(name = "language", length = 16)
    private String language;

    @Column(name = "config_json", columnDefinition = "LONGTEXT", nullable = false)
    private String configJson;

    @Column(name = "current_question_index", nullable = false)
    private int currentQuestionIndex;

    @Column(name = "question_count", nullable = false)
    @Builder.Default
    private int questionCount = 5;

    @Column(name = "finished", nullable = false)
    private boolean finished;

    @Column(name = "ai_profile", length = 32, nullable = false)
    @Builder.Default
    private String aiProfile = "FAST";

    @Column(name = "model_id", length = 100)
    private String modelId;

    @Column(name = "provider_type", length = 16)
    private String providerType;

    @Column(name = "actual_model_id", length = 200)
    private String actualModelId;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    @Builder.Default
    private List<InterviewMessageEntity> messages = new ArrayList<>();

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private InterviewAnalysisEntity analysis;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = Instant.now();
        }
    }

    public void setAnalysis(InterviewAnalysisEntity analysis) {
        this.analysis = analysis;
        if (analysis != null) {
            analysis.setSession(this);
        }
    }
}
