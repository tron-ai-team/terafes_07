package com.tronai.cv.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CvDocumentDetailDto {
    private Long id;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private String sha256;
    private int pageCount;
    private int textCharacters;
    private String status;
    private boolean primary;
    private String versionLabel;
    private Instant createdAt;
    private List<EducationItemDto> education;
    private List<String> skills;
    private List<ExperienceItemDto> workExperience;
    private List<String> extractionNotes;
    private List<String> languages;
    private String summaryText;
    private String rawTextExcerpt;
}
