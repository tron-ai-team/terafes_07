package com.tronai.career.company;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class CompanyAnalysisDtos {
    private CompanyAnalysisDtos() {}

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AnalyzeRequest {
        private String companyName;
        private String websiteUrl;
        private String recruitmentUrl;
        private Long cvDocumentId;
        private String language;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SourceDto {
        private String url;
        private String title;
        private String excerpt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AnalysisResponse {
        private String id;
        private String companyName;
        private String websiteUrl;
        private String recruitmentUrl;
        private Long cvDocumentId;
        private String language;
        private String status;
        private Map<String, Object> overview;
        private Map<String, Object> requirements;
        private Map<String, Object> comparison;
        private Map<String, Object> preparation;
        private List<SourceDto> sources;
        private List<SuggestionDto> suggestions;
        private Instant completedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SuggestionDto {
        private String id;
        private String fieldKey;
        private String proposedText;
        private String reason;
        private String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TransferRequest {
        private String draftId;
        private List<String> suggestionIds;
    }
}
