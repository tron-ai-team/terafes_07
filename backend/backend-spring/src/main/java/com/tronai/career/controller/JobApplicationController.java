package com.tronai.career.controller;

import com.tronai.auth.SecurityUtils;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.service.JobApplicationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/career/applications")
@Tag(name = "Job Applications", description = "Application tracker CRUD")
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    public JobApplicationController(JobApplicationService jobApplicationService) {
        this.jobApplicationService = jobApplicationService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CareerDtos.ApplicationResponse> create(@RequestBody CareerDtos.ApplicationRequest request) {
        return ResponseEntity.ok(jobApplicationService.create(SecurityUtils.getRequiredUserId(), request));
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<CareerDtos.ApplicationResponse>> list() {
        return ResponseEntity.ok(jobApplicationService.list(SecurityUtils.getRequiredUserId()));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CareerDtos.ApplicationResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(jobApplicationService.get(SecurityUtils.getRequiredUserId(), id));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CareerDtos.ApplicationResponse> update(@PathVariable String id,
                                                                 @RequestBody CareerDtos.ApplicationRequest request) {
        return ResponseEntity.ok(jobApplicationService.update(SecurityUtils.getRequiredUserId(), id, request));
    }

    @DeleteMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        jobApplicationService.delete(SecurityUtils.getRequiredUserId(), id);
        return ResponseEntity.ok(Map.of("detail", "Application deleted"));
    }
}
