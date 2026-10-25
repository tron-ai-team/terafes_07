package com.tronai.career.profile;

import com.tronai.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "candidate_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Column(name = "name_ja", length = 255)
    private String nameJa;

    @Column(length = 255)
    private String furigana;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 100)
    private String nationality;

    @Column(name = "address_text", length = 1024)
    private String addressText;

    @Column(length = 255)
    private String email;

    @Column(length = 64)
    private String phone;

    @Column(name = "photo_object_key", length = 500)
    private String photoObjectKey;

    @Column(name = "education_json", columnDefinition = "LONGTEXT")
    private String educationJson;

    @Column(name = "career_json", columnDefinition = "LONGTEXT")
    private String careerJson;

    @Column(name = "skills_json", columnDefinition = "LONGTEXT")
    private String skillsJson;

    @Column(name = "languages_json", columnDefinition = "LONGTEXT")
    private String languagesJson;

    @Column(name = "self_pr", columnDefinition = "LONGTEXT")
    private String selfPr;

    @Column(name = "career_goals", columnDefinition = "LONGTEXT")
    private String careerGoals;

    @Column(columnDefinition = "LONGTEXT")
    private String motivation;

    @Column(name = "preferences_json", columnDefinition = "LONGTEXT")
    private String preferencesJson;

    @Column(name = "completeness_score", nullable = false)
    @Builder.Default
    private int completenessScore = 0;

    @Column(name = "confirmed_fields_json", columnDefinition = "LONGTEXT")
    private String confirmedFieldsJson;

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
