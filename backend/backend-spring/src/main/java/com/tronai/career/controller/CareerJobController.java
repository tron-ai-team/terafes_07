package com.tronai.career.controller;

import com.tronai.auth.SecurityUtils;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.service.CareerJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/career/jobs")
@Tag(name = "Career Jobs", description = "Job search and import (Mynavi + CareerMap only)")
public class CareerJobController {

    private final CareerJobService careerJobService;

    public CareerJobController(CareerJobService careerJobService) {
        this.careerJobService = careerJobService;
    }

    @PostMapping(value = "/search", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Search verified Mynavi/CareerMap listings (never fabricates jobs)")
    public ResponseEntity<List<CareerDtos.CareerJobResult>> search(@RequestBody CareerDtos.JobSearchRequest request) {
        return ResponseEntity.ok(careerJobService.searchJobs(SecurityUtils.getRequiredUserId(), request));
    }

    @PostMapping(value = "/sources", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Provider status and official external search URLs")
    public ResponseEntity<CareerDtos.JobSourcesResponse> sources(
            @RequestBody(required = false) CareerDtos.JobSearchRequest request) {
        return ResponseEntity.ok(careerJobService.sources(SecurityUtils.getRequiredUserId(), request));
    }

    @GetMapping(value = "/sources", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Provider status and official external search URLs")
    public ResponseEntity<CareerDtos.JobSourcesResponse> sourcesGet() {
        return ResponseEntity.ok(careerJobService.sources(SecurityUtils.getRequiredUserId(), new CareerDtos.JobSearchRequest()));
    }

    @PostMapping(value = "/refresh", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Force refresh from allowed public sources")
    public ResponseEntity<Map<String, Object>> refresh(@RequestBody(required = false) CareerDtos.JobSearchRequest request) {
        return ResponseEntity.ok(careerJobService.refreshSources(SecurityUtils.getRequiredUserId(), request));
    }

    @GetMapping(value = "/saved", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "List saved jobs for the authenticated user")
    public ResponseEntity<List<CareerDtos.CareerJobResult>> saved() {
        return ResponseEntity.ok(careerJobService.listSavedJobs(SecurityUtils.getRequiredUserId()));
    }

    @PostMapping(value = "/import", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Import a job by original Mynavi/CareerMap URL")
    public ResponseEntity<CareerDtos.CareerJobResult> importJob(@RequestBody CareerDtos.JobImportRequest request) {
        return ResponseEntity.ok(careerJobService.importJob(SecurityUtils.getRequiredUserId(), request));
    }

    @PostMapping(value = "/{jobId}/save", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Bookmark or unsave a Career job")
    public ResponseEntity<Map<String, Object>> saveJob(@PathVariable String jobId,
                                                       @RequestBody CareerDtos.JobSaveToggleRequest body) {
        boolean saved = body != null && body.isSaved();
        return ResponseEntity.ok(careerJobService.toggleSave(SecurityUtils.getRequiredUserId(), jobId, saved));
    }
}
