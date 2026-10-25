package com.tronai.career.company;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "company_analyses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyAnalysisEntity {
    @Id @Column(length = 36) private String id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "company_name", nullable = false, length = 512) private String companyName;
    @Column(name = "website_url", nullable = false, length = 1024) private String websiteUrl;
    @Column(name = "recruitment_url", length = 1024) private String recruitmentUrl;
    @Column(name = "cv_document_id") private Long cvDocumentId;
    @Column(name = "cv_draft_id", length = 36) private String cvDraftId;
    @Column(nullable = false, length = 16) @Builder.Default private String language = "en";
    @Column(nullable = false, length = 32) private String status;
    @Column(name = "overview_json", columnDefinition = "LONGTEXT") private String overviewJson;
    @Column(name = "requirements_json", columnDefinition = "LONGTEXT") private String requirementsJson;
    @Column(name = "comparison_json", columnDefinition = "LONGTEXT") private String comparisonJson;
    @Column(name = "preparation_json", columnDefinition = "LONGTEXT") private String preparationJson;
    @Column(name = "error_message", length = 1024) private String errorMessage;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "completed_at") private Instant completedAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
