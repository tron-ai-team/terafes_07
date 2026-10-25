package com.tronai.career.company;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "company_research_sources")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyResearchSourceEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "analysis_id", nullable = false, length = 36) private String analysisId;
    @Column(name = "source_url", nullable = false, length = 1024) private String sourceUrl;
    @Column(length = 512) private String title;
    @Column(columnDefinition = "LONGTEXT") private String excerpt;
    @Column(name = "extracted_at", nullable = false) private Instant extractedAt;
    @PrePersist void onCreate() { if (extractedAt == null) extractedAt = Instant.now(); }
}
