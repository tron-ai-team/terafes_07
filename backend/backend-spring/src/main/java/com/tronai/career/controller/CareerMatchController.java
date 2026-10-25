package com.tronai.career.controller;

import com.tronai.auth.SecurityUtils;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.service.CareerMatchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/career/matches")
@Tag(name = "Career Matches", description = "CV to job matching")
public class CareerMatchController {

    private final CareerMatchService careerMatchService;

    public CareerMatchController(CareerMatchService careerMatchService) {
        this.careerMatchService = careerMatchService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CareerDtos.MatchResponse> create(@RequestBody CareerDtos.MatchRequest request) {
        return ResponseEntity.ok(careerMatchService.createMatch(SecurityUtils.getRequiredUserId(), request));
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<CareerDtos.MatchResponse>> list() {
        return ResponseEntity.ok(careerMatchService.listMatches(SecurityUtils.getRequiredUserId()));
    }
}
