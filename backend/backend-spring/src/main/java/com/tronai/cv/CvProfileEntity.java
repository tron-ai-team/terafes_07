package com.tronai.cv;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "cv_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CvProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_document_id", nullable = false, unique = true)
    private CvDocumentEntity document;

    @Column(name = "education_json", columnDefinition = "LONGTEXT")
    private String educationJson;

    @Column(name = "skills_json", columnDefinition = "LONGTEXT")
    private String skillsJson;

    @Column(name = "work_experience_json", columnDefinition = "LONGTEXT")
    private String workExperienceJson;

    @Column(name = "extraction_notes_json", columnDefinition = "LONGTEXT")
    private String extractionNotesJson;

    @Column(name = "languages_json", columnDefinition = "LONGTEXT")
    private String languagesJson;

    @Column(name = "summary_text", columnDefinition = "LONGTEXT")
    private String summaryText;

    @Column(name = "raw_text_excerpt", columnDefinition = "LONGTEXT")
    private String rawTextExcerpt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
