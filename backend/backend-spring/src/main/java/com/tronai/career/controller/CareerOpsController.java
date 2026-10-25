package com.tronai.career.controller;

import com.tronai.auth.SecurityUtils;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.service.CareerOpsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/career/ops")
@Tag(name = "Career Ops", description = "Career operations integration status")
public class CareerOpsController {

    private final CareerOpsService careerOpsService;

    public CareerOpsController(CareerOpsService careerOpsService) {
        this.careerOpsService = careerOpsService;
    }

    @GetMapping(value = "/status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CareerDtos.OpsStatusResponse> status() {
        return ResponseEntity.ok(careerOpsService.status(SecurityUtils.getRequiredUserId()));
    }
}
