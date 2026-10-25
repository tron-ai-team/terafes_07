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
    @Operation(summary = "Search Mynavi and CareerMap public listings")
    public ResponseEntity<List<CareerDtos.CareerJobResult>> search(@RequestBody CareerDtos.JobSearchRequest request) {
        return ResponseEntity.ok(careerJobService.searchJobs(SecurityUtils.getRequiredUserId(), request));
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
