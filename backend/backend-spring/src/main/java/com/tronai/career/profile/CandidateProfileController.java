package com.tronai.career.profile;

import com.tronai.auth.SecurityUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/career/profile")
@Tag(name = "Candidate Profile", description = "Shared Career Center candidate profile")
public class CandidateProfileController {

    private final CandidateProfileService service;

    public CandidateProfileController(CandidateProfileService service) {
        this.service = service;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CandidateProfileDtos.ProfileResponse> get() {
        return ResponseEntity.ok(service.get(SecurityUtils.getRequiredUserId()));
    }

    @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CandidateProfileDtos.ProfileResponse> upsert(@RequestBody CandidateProfileDtos.ProfileRequest request) {
        return ResponseEntity.ok(service.upsert(SecurityUtils.getRequiredUserId(), request));
    }

    @GetMapping(value = "/completeness", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CandidateProfileDtos.ProfileResponse> completeness() {
        return ResponseEntity.ok(service.get(SecurityUtils.getRequiredUserId()));
    }
}
