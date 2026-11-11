package com.tronai.career.cvbuilder;

import com.tronai.auth.SecurityUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/career/cv-builder")
@Tag(name = "CV Builder", description = "Japanese 履歴書 builder — canonical HTML preview + Chromium PDF")
public class CvBuilderController {

    private static final String PREVIEW_CSP =
            "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data: *; "
                    + "base-uri 'none'; form-action 'none'; frame-ancestors 'self'; script-src 'none'";

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

    @DeleteMapping("/drafts/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable String id) {
        return ResponseEntity.ok(service.deleteDraft(SecurityUtils.getRequiredUserId(), id));
    }

    @PostMapping(value = "/drafts/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadPhoto(
            @PathVariable String id,
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "false") boolean alsoUpdateProfile) {
        return ResponseEntity.ok(service.uploadDraftPhoto(
                SecurityUtils.getRequiredUserId(), id, file, alsoUpdateProfile));
    }

    @PostMapping("/drafts/{id}/photo/from-profile")
    public ResponseEntity<Map<String, Object>> useProfilePhoto(@PathVariable String id) {
        return ResponseEntity.ok(service.useProfilePhoto(SecurityUtils.getRequiredUserId(), id));
    }

    @DeleteMapping("/drafts/{id}/photo")
    public ResponseEntity<Map<String, Object>> removePhoto(@PathVariable String id) {
        return ResponseEntity.ok(service.removeDraftPhoto(SecurityUtils.getRequiredUserId(), id));
    }

    @GetMapping("/drafts/{id}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable String id) {
        CvBuilderService.OptionalPhotoBytes photo = service.getDraftPhoto(SecurityUtils.getRequiredUserId(), id);
        if (photo == null || photo.data() == null || photo.data().length == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV photo not found");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .body(photo.data());
    }

    @PostMapping("/drafts/{id}/magic-fill")
    public ResponseEntity<Map<String, Object>> magicFill(@PathVariable String id,
                                                         @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(service.magicFill(
                SecurityUtils.getRequiredUserId(), id, body == null ? Map.of() : body));
    }

    @PostMapping("/drafts/{id}/magic-fill/decide")
    public ResponseEntity<Map<String, Object>> magicFillDecide(@PathVariable String id,
                                                               @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.decideMagicFillBatch(SecurityUtils.getRequiredUserId(), id, body));
    }

    /**
     * Canonical HTML preview (saved draft). Same {@code CvHtmlPdfRenderer} document as PDF.
     * Does not invoke Gotenberg.
     */
    @GetMapping(value = "/drafts/{id}/preview-html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<byte[]> previewHtmlSaved(@PathVariable String id) {
        byte[] html = service.renderPreviewHtml(SecurityUtils.getRequiredUserId(), id, null);
        return htmlPreviewResponse(html);
    }

    /**
     * Canonical HTML preview with optional unsaved editor payload.
     * Body: {@code { "payload": { ... } }} — when payload is present it is rendered without DB write.
     */
    @PostMapping(value = "/drafts/{id}/preview-html", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<byte[]> previewHtmlLive(@PathVariable String id,
                                                  @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> override = null;
        if (body != null && body.get("payload") instanceof Map<?, ?>) {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) body.get("payload");
            override = payload;
        }
        byte[] html = service.renderPreviewHtml(SecurityUtils.getRequiredUserId(), id, override);
        return htmlPreviewResponse(html);
    }

    /**
     * Legacy PDF-document preview (generates a stored PDF). Prefer {@code preview-html} for live UI.
     */
    @PostMapping("/drafts/{id}/preview")
    public ResponseEntity<Map<String, Object>> preview(@PathVariable String id,
                                                       @RequestParam(defaultValue = "pdf") String format) {
        try {
            Map<String, Object> meta = new java.util.LinkedHashMap<>(
                    service.export(SecurityUtils.getRequiredUserId(), id, format));
            meta.put("preview", true);
            return ResponseEntity.ok(meta);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Preview failed: " + (e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()), e);
        }
    }

    private static ResponseEntity<byte[]> htmlPreviewResponse(byte[] html) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "html", java.nio.charset.StandardCharsets.UTF_8))
                .header("Content-Security-Policy", PREVIEW_CSP)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(html);
    }

    @PostMapping("/drafts/{id}/refresh-from-profile")
    public ResponseEntity<Map<String, Object>> refreshFromProfile(@PathVariable String id,
                                                                  @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(service.refreshFromProfile(
                SecurityUtils.getRequiredUserId(), id, body == null ? Map.of() : body));
    }

    @GetMapping("/drafts/{id}/education-preview")
    public ResponseEntity<Map<String, Object>> educationPreview(@PathVariable String id) {
        return ResponseEntity.ok(service.educationPreview(SecurityUtils.getRequiredUserId(), id));
    }

    @PostMapping("/drafts/{id}/sanitize-education")
    public ResponseEntity<Map<String, Object>> sanitizeEducation(@PathVariable String id) {
        return ResponseEntity.ok(service.sanitizeEducation(SecurityUtils.getRequiredUserId(), id));
    }

    @GetMapping("/drafts/{id}/versions")
    public ResponseEntity<List<Map<String, Object>>> listVersions(@PathVariable String id) {
        return ResponseEntity.ok(service.listVersions(SecurityUtils.getRequiredUserId(), id));
    }

    @PostMapping("/drafts/{id}/versions/{versionId}/restore")
    public ResponseEntity<Map<String, Object>> restoreVersion(@PathVariable String id, @PathVariable String versionId) {
        return ResponseEntity.ok(service.restoreVersion(SecurityUtils.getRequiredUserId(), id, versionId));
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
                                                      @RequestParam(defaultValue = "pdf") String format) {
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
