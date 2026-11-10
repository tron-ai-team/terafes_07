package com.tronai.career.profile;

import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class CandidateProfileDtos {
    private CandidateProfileDtos() {}

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfileRequest {
        private String fullName;
        private String nameJa;
        private String furigana;
        /**
         * Accept string dates (YYYY-MM-DD / YYYY/MM/DD / etc.) to avoid Jackson LocalDate
         * hard-failures on common user formats. Parsed in CandidateProfileService.
         */
        private Object dateOfBirth;
        private String nationality;
        private String gender;
        private String addressText;
        private String postalCode;
        private String prefecture;
        private String city;
        private String streetAddress;
        private String building;
        private String email;
        private String phone;
        private List<Map<String, Object>> education;
        private String educationLegacyText;
        /** When true, replaces education after user confirms suggested migration. */
        private Boolean confirmEducationMigration;
        private List<Map<String, Object>> career;
        private Boolean noWorkExperience;
        /** Accepts string[] or object[]; normalized in service. */
        private List<Object> skills;
        /** Accepts string[] or object[]; normalized in service. */
        private List<Object> languages;
        private List<Map<String, Object>> projects;
        private List<Map<String, Object>> certifications;
        private String selfPr;
        private String careerGoals;
        /** Master-profile general motivation — not company-specific 志望動機. */
        private String motivation;
        private Map<String, Object> careerStories;
        private Map<String, Object> international;
        private Map<String, Object> preferences;
        private List<String> confirmedFields;
        /** When null/absent, treated as false (Jackson FAIL_ON_NULL_FOR_PRIMITIVES). */
        private Boolean allowOverwriteConfirmed;

        public boolean isAllowOverwriteConfirmed() {
            return Boolean.TRUE.equals(allowOverwriteConfirmed);
        }
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProfileResponse {
        private Long id;
        private String fullName;
        private String nameJa;
        private String furigana;
        private LocalDate dateOfBirth;
        private String nationality;
        private String gender;
        private String addressText;
        private String postalCode;
        private String prefecture;
        private String city;
        private String streetAddress;
        private String building;
        private String email;
        private String phone;
        private String photoObjectKey;
        private List<Map<String, Object>> education;
        private String educationLegacyText;
        private String educationMigrationStatus;
        private List<Map<String, Object>> educationSuggestions;
        private List<Map<String, Object>> career;
        private boolean noWorkExperience;
        private List<Map<String, Object>> skills;
        private List<Map<String, Object>> languages;
        private List<Map<String, Object>> projects;
        private List<Map<String, Object>> certifications;
        private String selfPr;
        private String careerGoals;
        private String motivation;
        private Map<String, Object> careerStories;
        private Map<String, Object> international;
        private Map<String, Object> preferences;
        private int completenessScore;
        private List<String> confirmedFields;
        private List<String> missingFields;
        private Map<String, Object> completenessBreakdown;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiSuggestRequest {
        private String fieldKey;
        private String currentText;
        private String instruction;
        private String language;
        private Boolean allowCloud;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiSuggestResponse {
        private String fieldKey;
        private String originalText;
        private String proposedText;
        private String reason;
        private String engine;
        private boolean requiresApproval;
    }
}
