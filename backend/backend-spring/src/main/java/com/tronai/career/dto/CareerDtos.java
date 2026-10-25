package com.tronai.career.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class CareerDtos {

    private CareerDtos() {}

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CareerSearchRequest {
        private String websiteUrl;
        private String targetRole;
        private String location;
        private List<String> keywords;
        private Integer minimumMatch;
        private Integer maxResults;
        private Long cvId;
        private String language;
        private String aiProfile;
        private String employmentType;
        private Boolean newGraduateOnly;
        private String japaneseLevel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CareerAgentStep {
        private int step;
        private String title;
        private String description;
        private String status;
        private String timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CareerAgentMetrics {
        private int jobsDiscovered;
        private int jobsAnalyzed;
        private int jobsMatched;
        private long durationMs;
        private String aiProfile;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CareerJobResult {
        private String id;
        private String title;
        private String company;
        private String location;
        private String sourceUrl;
        private int matchScore;
        private String matchTier;
        private String employmentType;
        private Boolean newGraduateEligible;
        private List<String> requiredSkills;
        private List<String> matchedSkills;
        private List<String> missingSkills;
        private String japaneseRequirement;
        private String educationRequirement;
        private String experienceRequirement;
        private String visaSupport;
        private String salary;
        private List<String> reasons;
        private List<String> risks;
        private String discoveredAt;
        private String fullDescription;
        private Boolean saved;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class CareerSearchResponse {
        private String runId;
        private String status;
        private List<CareerAgentStep> steps;
        private List<CareerJobResult> results;
        private CareerAgentMetrics metrics;
        private String blockedReason;
        private String error;
        private Boolean isDemo;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobSearchRequest {
        private String query;
        private String location;
        private List<String> keywords;
        private String employmentType;
        private Boolean newGraduateOnly;
        private Integer maxResults;
        private String language;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobImportRequest {
        private String sourceUrl;
        private String language;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobSaveToggleRequest {
        private boolean saved;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchRequest {
        private Long cvDocumentId;
        private String jobId;
        private String language;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MatchResponse {
        private String id;
        private Long cvDocumentId;
        private String jobId;
        private int matchScore;
        private String matchTier;
        private List<String> mandatoryBlockers;
        private List<String> matchedSkills;
        private List<String> missingSkills;
        private List<String> strengths;
        private List<String> gaps;
        private List<String> reasons;
        private List<String> improvements;
        private Map<String, Object> rubric;
        private String language;
        private Instant createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApplicationRequest {
        private String jobId;
        private Long cvDocumentId;
        private String interviewSessionId;
        private String company;
        private String position;
        private String sourceUrl;
        private String status;
        private LocalDate applicationDate;
        private String nextAction;
        private Instant deadlineAt;
        private Instant interviewAt;
        private String notes;
        private Map<String, Object> reminder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ApplicationResponse {
        private String id;
        private String jobId;
        private Long cvDocumentId;
        private String interviewSessionId;
        private String company;
        private String position;
        private String sourceUrl;
        private String status;
        private LocalDate applicationDate;
        private String nextAction;
        private Instant deadlineAt;
        private Instant interviewAt;
        private String notes;
        private Map<String, Object> reminder;
        private Instant createdAt;
        private Instant updatedAt;
        private List<StatusHistoryItem> statusHistory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusHistoryItem {
        private String fromStatus;
        private String toStatus;
        private String note;
        private Instant changedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardResponse {
        private int cvCount;
        private int primaryCvId;
        private int savedJobs;
        private int matchCount;
        private int applicationCount;
        private int interviewCount;
        private Map<String, Long> applicationsByStatus;
        private List<String> recommendedActions;
        private List<CareerSearchResponse> recentRuns;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpsProviderStatus {
        private String provider;
        private String status;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpsStatusResponse {
        private List<OpsProviderStatus> providers;
    }
}
