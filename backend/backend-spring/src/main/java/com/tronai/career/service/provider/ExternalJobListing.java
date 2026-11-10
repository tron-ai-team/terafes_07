package com.tronai.career.service.provider;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ExternalJobListing {
    private String provider;
    private String sourceId;
    private String sourceUrl;
    private String title;
    private String company;
    private String location;
    private String employmentType;
    private Boolean newGraduateEligible;
    private String description;
    private List<String> tags;
    private Instant publishedAt;
    /** When this listing was last verified against the source. */
    private Instant lastVerifiedAt;
    /** OPEN / CLOSED / UNKNOWN — never invent OPEN. */
    private String applicationStatus;
    /** YES / NO / UNKNOWN */
    private String internationalStudentPolicy;
    private String graduationYear;
    private String verificationNotes;
}
