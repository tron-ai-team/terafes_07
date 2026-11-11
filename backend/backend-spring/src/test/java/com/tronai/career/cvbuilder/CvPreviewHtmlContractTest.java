package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Contract: preview HTML and PDF HTML must share the same CvHtmlPdfRenderer document.
 */
class CvPreviewHtmlContractTest {

    private final CvHtmlPdfRenderer renderer = new CvHtmlPdfRenderer();

    @Test
    void previewAndPdfHtmlAreIdenticalForSamePayload() {
        Map<String, Object> payload = sample();
        String photo = "data:image/jpeg;base64,AAAA";
        byte[] a = renderer.renderHtml("RIREKISHO_JA", payload, photo);
        byte[] b = renderer.renderHtml("RIREKISHO_JA", payload, photo);
        assertArrayEquals(a, b);
        String html = new String(a, StandardCharsets.UTF_8);
        assertTrue(html.contains("履 歴 書") || html.contains("履歴書"));
        assertTrue(html.contains("class=\"paper\""));
        assertTrue(html.contains("cv-page-1"));
        assertTrue(html.contains("cv-page-2"));
        assertTrue(html.contains(photo));
        assertFalse(html.contains("<script"));
    }

    private static Map<String, Object> sample() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("nameJa", "検証　太郎");
        p.put("furigana", "けんしょう　たろう");
        p.put("dateOfBirth", "1999-01-02");
        p.put("postalCode", "100-0001");
        p.put("addressText", "東京都千代田区1-1");
        p.put("email", "verify@example.com");
        p.put("phone", "080-0000-0000");
        p.put("selfPr", "検証用自己PR");
        p.put("education", List.of());
        p.put("workExperience", List.of());
        p.put("certifications", List.of());
        return p;
    }
}
