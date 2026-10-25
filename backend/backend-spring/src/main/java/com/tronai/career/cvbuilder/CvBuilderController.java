package com.tronai.career.cvbuilder;

import com.tronai.auth.SecurityUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/career/cv-builder")
@Tag(name = "CV Builder", description = "AI CV Builder with Japanese Excel master template")
public class CvBuilderController {

    private final CvBuilderService service;

    public CvBuilderController(CvBuilderService service) {
        this.service = service;
    }

    @GetMapping("/templates")
    public ResponseEntity<List<Map<String, Object>>> templates() {
        return ResponseEntity.ok(service.listTemplates());
    }

    @GetMapping("/templates/{code}/schema")
    public ResponseEntity<Map<String, Object>> schema(@PathVariable String code) {
        return ResponseEntity.ok(service.templateSchema(code));
    }

    @GetMapping("/drafts")
    public ResponseEntity<List<Map<String, Object>>> listDrafts() {
        return ResponseEntity.ok(service.listDrafts(SecurityUtils.getRequiredUserId()));
    }

    @PostMapping("/drafts")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.createDraft(SecurityUtils.getRequiredUserId(), body));
    }

    @GetMapping("/drafts/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id) {
        return ResponseEntity.ok(service.getDraft(SecurityUtils.getRequiredUserId(), id));
    }

    @PutMapping("/drafts/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.updateDraft(SecurityUtils.getRequiredUserId(), id, body));
    }

    @PostMapping("/drafts/{id}/ai-assist")
    public ResponseEntity<Map<String, Object>> aiAssist(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.aiAssist(SecurityUtils.getRequiredUserId(), id, body));
    }

    @PostMapping("/drafts/{id}/suggestions/{sid}/accept")
    public ResponseEntity<Map<String, Object>> accept(@PathVariable String id, @PathVariable String sid) {
        return ResponseEntity.ok(service.decideSuggestion(SecurityUtils.getRequiredUserId(), id, sid, true));
    }

    @PostMapping("/drafts/{id}/suggestions/{sid}/reject")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable String id, @PathVariable String sid) {
        return ResponseEntity.ok(service.decideSuggestion(SecurityUtils.getRequiredUserId(), id, sid, false));
    }

    @PostMapping("/drafts/{id}/versions")
    public ResponseEntity<Map<String, Object>> saveVersion(@PathVariable String id) {
        return ResponseEntity.ok(service.saveVersion(SecurityUtils.getRequiredUserId(), id));
    }

    @PostMapping("/drafts/{id}/export")
    public ResponseEntity<Map<String, Object>> export(@PathVariable String id,
                                                      @RequestParam(defaultValue = "xlsx") String format) {
        try {
            return ResponseEntity.ok(service.export(SecurityUtils.getRequiredUserId(), id, format));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Export failed: " + e.getMessage(), e);
        }
    }

    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<byte[]> download(@PathVariable String documentId) {
        Long userId = SecurityUtils.getRequiredUserId();
        CvGeneratedDocumentEntity meta = service.requireDocument(userId, documentId);
        byte[] bytes = service.download(userId, documentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + meta.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(meta.getContentType()))
                .body(bytes);
    }
}
