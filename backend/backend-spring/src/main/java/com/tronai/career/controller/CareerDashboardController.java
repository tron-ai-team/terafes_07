package com.tronai.career.controller;

import com.tronai.auth.SecurityUtils;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.service.CareerDashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/career/dashboard")
@Tag(name = "Career Dashboard", description = "Aggregated career center metrics")
public class CareerDashboardController {

    private final CareerDashboardService careerDashboardService;

    public CareerDashboardController(CareerDashboardService careerDashboardService) {
        this.careerDashboardService = careerDashboardService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CareerDtos.DashboardResponse> dashboard(@RequestParam(required = false) String language) {
        return ResponseEntity.ok(careerDashboardService.buildDashboard(SecurityUtils.getRequiredUserId(), language));
    }
}
