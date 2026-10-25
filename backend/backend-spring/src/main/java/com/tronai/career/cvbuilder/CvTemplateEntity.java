package com.tronai.career.cvbuilder;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "cv_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CvTemplateEntity {
    @Id
    @Column(length = 40)
    private String code;

    @Column(name = "display_name", nullable = false, length = 128)
    private String displayName;

    @Column(nullable = false, length = 16)
    private String locale;

    @Column(name = "schema_json", columnDefinition = "LONGTEXT", nullable = false)
    private String schemaJson;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
