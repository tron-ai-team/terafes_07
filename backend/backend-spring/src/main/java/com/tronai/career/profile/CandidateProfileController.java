package com.tronai.career.profile;

import com.tronai.auth.SecurityUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

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

    @GetMapping(value = "/photo")
    public ResponseEntity<byte[]> getPhoto() {
        Long userId = SecurityUtils.getRequiredUserId();
        CandidateProfileService.PhotoBytes photo = service.getPhoto(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile photo not found"));
        return ResponseEntity.ok()
                .contentType(photo.contentType())
                .body(photo.data());
    }

    @PostMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CandidateProfileDtos.ProfileResponse> uploadPhoto(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(service.uploadPhoto(SecurityUtils.getRequiredUserId(), file));
    }

    @PostMapping(value = "/ai-suggest", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CandidateProfileDtos.AiSuggestResponse> aiSuggest(@RequestBody CandidateProfileDtos.AiSuggestRequest request) {
        return ResponseEntity.ok(service.suggest(SecurityUtils.getRequiredUserId(), request));
    }
}
