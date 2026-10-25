package com.tronai.career.company;

import com.tronai.auth.SecurityUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/career/company-analyses")
@Tag(name = "Interview Agent — Company Analysis", description = "Company website research and CV comparison")
public class CompanyAnalysisController {

    private final CompanyAnalysisService service;

    public CompanyAnalysisController(CompanyAnalysisService service) {
        this.service = service;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(service.list(SecurityUtils.getRequiredUserId()));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> analyze(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.analyze(SecurityUtils.getRequiredUserId(), body));
    }

    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return ResponseEntity.ok(service.get(SecurityUtils.getRequiredUserId(), id));
    }

    @PostMapping(value = "/{id}/suggestions", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> suggestions(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.suggestImprovements(SecurityUtils.getRequiredUserId(), id, body));
    }

    @PostMapping(value = "/{id}/transfer-to-cv", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> transfer(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.transferToCvManager(SecurityUtils.getRequiredUserId(), id, body));
    }
}
