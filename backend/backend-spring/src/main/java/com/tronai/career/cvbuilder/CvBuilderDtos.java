package com.tronai.career.cvbuilder;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class CvBuilderDtos {
    private CvBuilderDtos() {}

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TemplateSummary {
        private String code;
        private String displayName;
        private String locale;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TemplateSchema {
        private String code;
        private Object schema;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DraftRequest {
        private String templateCode;
        private String versionLabel;
        private Map<String, Object> payload;
        private Long profileId;
        private Long sourceCvDocumentId;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DraftResponse {
        private String id;
        private String templateCode;
        private String versionLabel;
        private Map<String, Object> payload;
        private boolean primary;
        private String status;
        private Instant updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class VersionResponse {
        private String id;
        private String draftId;
        private int versionNumber;
        private String versionLabel;
        private Map<String, Object> payload;
        private Instant createdAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AiAssistRequest {
        private String fieldKey;
        private String instruction;
        private String language;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SuggestionResponse {
        private String id;
        private String fieldKey;
        private String originalText;
        private String proposedText;
        private String reason;
        private String status;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ExportResponse {
        private String documentId;
        private String format;
        private String objectKey;
        private String sha256;
        private long sizeBytes;
        private String fidelityNote;
        private byte[] content;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PreviewResponse {
        private String format;
        private byte[] content;
        private String fidelityNote;
    }
}
