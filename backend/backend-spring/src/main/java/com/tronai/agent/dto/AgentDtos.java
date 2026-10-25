package com.tronai.agent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;
import java.util.Map;

public class AgentDtos {

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentRunRequest {
        @NotBlank(message = "Goal cannot be blank")
        private String goal;

        /** Required unless {@code jobId} resolves company/title/description from a saved Career job. */
        private String companyName;

        private String jobPosition;

        private String jobDescription;

        @Builder.Default
        private String language = "ja";

        private Long cvId;

        /** Optional Career Center job id; when set, job fields may be enriched from persisted listing. */
        private String jobId;

        /** Optional company analysis id for interview prep context. */
        private String companyAnalysisId;

        private String aiProfile;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentStepDto {
        private int step;
        private String action;
        private String description;
        private String status;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentResultDto {
        private List<String> candidateStrengths;
        private List<String> skillGaps;
        private List<String> priorityTopics;
        private Map<String, Object> interviewStrategy;
        private List<Map<String, Object>> practiceQuestions;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentMetricsDto {
        private int stepsExecuted;
        private List<String> toolsUsed;
        private String model;
        private String aiProfile;
        private long durationMs;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentRunResponse {
        private String runId;
        private String status;
        private String goal;
        private String companyName;
        private String jobPosition;
        private String aiProfile;
        @Builder.Default
        private boolean locked = true;
        private List<AgentStepDto> steps;
        private AgentResultDto result;
        private AgentMetricsDto metrics;
    }
}
