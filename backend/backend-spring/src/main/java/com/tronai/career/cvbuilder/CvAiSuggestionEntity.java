package com.tronai.career.cvbuilder;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "cv_ai_suggestions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CvAiSuggestionEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "draft_id", nullable = false, length = 36) private String draftId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "field_key", nullable = false, length = 100) private String fieldKey;
    @Column(name = "original_text", columnDefinition = "LONGTEXT") private String originalText;
    @Column(name = "proposed_text", columnDefinition = "LONGTEXT") private String proposedText;
    @Column(columnDefinition = "LONGTEXT") private String reason;
    @Column(nullable = false, length = 32) @Builder.Default private String status = "PENDING";
    @Column(nullable = false, length = 16) @Builder.Default private String language = "en";
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "decided_at") private Instant decidedAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
