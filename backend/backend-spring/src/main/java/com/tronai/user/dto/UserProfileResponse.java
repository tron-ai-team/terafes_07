package com.tronai.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    /** Authentication account email — not Candidate Profile contact email. */
    private String email;
    private String displayName;
    private String role;
    private Instant createdAt;
    /** Latest persisted Candidate Profile summary (live read; may be empty). */
    private CandidateProfileSummaryDto candidateProfile;
}
