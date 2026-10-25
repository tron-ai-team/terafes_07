package com.tronai.cv;

import com.tronai.auth.SecurityUtils;
import com.tronai.cv.dto.CvDocumentDetailDto;
import com.tronai.cv.dto.CvDocumentSummaryDto;
import com.tronai.cv.dto.CvUploadResponse;
import com.tronai.cv.service.CvService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * REST controller for CV document upload and management.
 */
@RestController
@Tag(name = "CV Processing", description = "CV upload, parsing, document management, and MinIO private storage")
public class CvController {

    private final CvService cvService;

    public CvController(CvService cvService) {
        this.cvService = cvService;
    }

    @PostMapping(
            value = {"/demo/cv/upload", "/api/cv/upload"},
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(summary = "Upload and parse CV PDF document")
    public ResponseEntity<CvUploadResponse> uploadCv(@RequestParam("file") MultipartFile file) {
        CvUploadResponse response = cvService.processCvUpload(file);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/api/v1/cv", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "List all CV documents belonging to authenticated user")
    public ResponseEntity<List<CvDocumentSummaryDto>> listUserCvs() {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(cvService.listUserDocuments(userId));
    }

    @GetMapping(value = "/api/v1/cv/{cvId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Get specific CV document and parsed profile by ID")
    public ResponseEntity<CvDocumentDetailDto> getUserCv(@PathVariable("cvId") Long cvId) {
        Long userId = SecurityUtils.getRequiredUserId();
        return ResponseEntity.ok(cvService.getUserDocument(userId, cvId));
    }

    @DeleteMapping(value = "/api/v1/cv/{cvId}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Delete specific CV document and private MinIO object")
    public ResponseEntity<Map<String, String>> deleteUserCv(@PathVariable("cvId") Long cvId) {
        Long userId = SecurityUtils.getRequiredUserId();
        cvService.deleteUserDocument(userId, cvId);
        return ResponseEntity.ok(Map.of("detail", "CV document deleted successfully"));
    }

    @PostMapping(value = "/api/v1/cv/{cvId}/primary", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Mark CV as primary for the authenticated user")
    public ResponseEntity<Map<String, String>> setPrimary(@PathVariable("cvId") Long cvId) {
        cvService.setPrimaryCv(SecurityUtils.getRequiredUserId(), cvId);
        return ResponseEntity.ok(Map.of("detail", "Primary CV updated"));
    }

    @PutMapping(value = "/api/v1/cv/{cvId}/profile", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Edit extracted CV profile fields")
    public ResponseEntity<CvDocumentDetailDto> updateProfile(@PathVariable("cvId") Long cvId,
                                                             @RequestBody com.tronai.cv.dto.CvProfileUpdateRequest request) {
        return ResponseEntity.ok(cvService.updateProfile(SecurityUtils.getRequiredUserId(), cvId, request));
    }

    @GetMapping(value = "/api/v1/cv/{cvId}/suggestions", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "CV improvement suggestions")
    public ResponseEntity<com.tronai.cv.dto.CvSuggestionsResponse> suggestions(@PathVariable("cvId") Long cvId,
                                                                               @RequestParam(required = false) String jobId,
                                                                               @RequestParam(required = false) String language) {
        return ResponseEntity.ok(cvService.suggestions(SecurityUtils.getRequiredUserId(), cvId, jobId, language));
    }
}
