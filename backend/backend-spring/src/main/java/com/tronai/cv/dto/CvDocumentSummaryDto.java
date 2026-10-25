package com.tronai.cv.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CvDocumentSummaryDto {
    private Long id;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private int pageCount;
    private int textCharacters;
    private String status;
    private boolean primary;
    private String versionLabel;
    private Instant createdAt;
}
