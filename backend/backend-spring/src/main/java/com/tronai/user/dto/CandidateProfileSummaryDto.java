package com.tronai.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Read-only projection of Candidate Profile for User Profile page.
 * Sourced live from candidate_profiles — not duplicated storage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfileSummaryDto {
    private boolean profileExists;
    private String fullName;
    private String nameJa;
    private String furigana;
    /** Auth-protected relative path when a photo is stored; null otherwise. */
    private String photoUrl;
    private boolean hasPhoto;
    private List<String> education;
    private String expectedGraduationYear;
    private List<String> targetJobs;
    private List<String> preferredLocations;
    private List<String> skills;
    private List<String> certifications;
    private String jlptLevel;
    private List<String> projects;
    private Integer completenessScore;
    private List<String> missingFields;
    /** Candidate contact email (may differ from authentication email). */
    private String contactEmail;
}
