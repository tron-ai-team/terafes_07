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
        private LocalDate dateOfBirth;
        private String nationality;
        private String addressText;
        private String email;
        private String phone;
        private List<Map<String, Object>> education;
        private List<Map<String, Object>> career;
        private List<String> skills;
        private List<String> languages;
        private String selfPr;
        private String careerGoals;
        private String motivation;
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
        private String addressText;
        private String email;
        private String phone;
        private String photoObjectKey;
        private List<Map<String, Object>> education;
        private List<Map<String, Object>> career;
        private List<String> skills;
        private List<String> languages;
        private String selfPr;
        private String careerGoals;
        private String motivation;
        private Map<String, Object> preferences;
        private int completenessScore;
        private List<String> confirmedFields;
        private List<String> missingFields;
        private Instant updatedAt;
    }
}
