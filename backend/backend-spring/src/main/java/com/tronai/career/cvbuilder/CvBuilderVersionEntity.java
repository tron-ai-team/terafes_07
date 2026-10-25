package com.tronai.career.cvbuilder;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "cv_builder_versions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CvBuilderVersionEntity {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "draft_id", nullable = false, length = 36)
    private String draftId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "template_code", nullable = false, length = 40)
    private String templateCode;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "version_label", length = 100)
    private String versionLabel;

    @Column(name = "payload_json", columnDefinition = "LONGTEXT", nullable = false)
    private String payloadJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
