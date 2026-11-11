package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CvHtmlPdfRendererTest {

    private final CvHtmlPdfRenderer renderer = new CvHtmlPdfRenderer();

    @Test
    void rirekishoIsTwoPageOwnerGeometry() {
        Map<String, Object> payload = sampleJa();
        String html = new String(renderer.renderHtml("RIREKISHO_JA", payload, null), StandardCharsets.UTF_8);
        assertTrue(html.contains("履 歴 書") || html.contains("履歴書"));
        assertTrue(html.contains("class=\"paper\""));
        assertTrue(html.contains("cv-page-1"));
        assertTrue(html.contains("cv-page-2"));
        assertTrue(html.contains("山田　太郎"));
        assertTrue(html.contains("やまだ　たろう"));
        assertTrue(html.contains("東京都"));
        assertTrue(html.contains("〒150-0001"));
        assertTrue(html.contains("history-table"));
        assertTrue(html.contains("license-table"));
        assertTrue(html.contains("自己"));
        assertTrue(html.contains("免許"));
        assertTrue(html.contains("写真貼付"));
        assertTrue(html.contains("2020"));
        assertTrue(html.contains("東京工業大学"));
        assertTrue(html.contains("満") && html.contains("歳"));
        assertTrue(html.contains("090-1234-5678")); // mobile slot
        assertFalse(html.contains("<script"));
        // postal must appear once (not duplicated into street)
        assertEquals(1, countOccurrences(html, "150-0001"));
    }

    @Test
    void addressNormalizationStripsDuplicatePostal() {
        CvHtmlPdfRenderer.AddressParts a = CvHtmlPdfRenderer.normalizeAddress(
                "160-0023", "〒160-0023 東京都新宿区西新宿2-8-1");
        assertEquals("160-0023", a.postal());
        assertEquals("東京都新宿区西新宿2-8-1", a.street());
        assertTrue(a.block().startsWith("〒160-0023"));
        assertEquals(1, countOccurrences(a.block(), "160-0023"));
    }

    @Test
    void mobileGoesToMobileFieldNotLandline() {
        CvHtmlPdfRenderer.PhoneParts p = CvHtmlPdfRenderer.splitPhones("090-1111-2222", "", "");
        assertEquals("", p.landline());
        assertEquals("090-1111-2222", p.mobile());
    }

    @Test
    void longSelfPrContinuesInAdditionalNotesRegion() {
        String longPr = "私は課題を整理し、原因を検証しながら解決まで取り組みます。".repeat(20);
        Map<String, Object> payload = sampleJa();
        payload.put("selfPr", longPr);
        payload.put("motivationGeneral", "貴社の技術力に魅力を感じました。");
        String html = new String(renderer.renderHtml("RIREKISHO_JA", payload, null), StandardCharsets.UTF_8);
        assertTrue(html.contains("【志望動機】"));
        assertTrue(html.contains("【自己PR（続き）】") || html.contains("課題を整理"));
        // qualifications section still present and not replaced
        assertTrue(html.contains("license-table"));
        assertTrue(html.contains("普通自動車第一種運転免許"));
    }

    @Test
    void rirekishoEmbedsPhotoDataUri() {
        String uri = "data:image/jpeg;base64,AAAA";
        String html = new String(renderer.renderHtml("RIREKISHO_JA", sampleJa(), uri), StandardCharsets.UTF_8);
        assertTrue(html.contains(uri));
        assertTrue(html.contains("portrait"));
        assertFalse(html.contains("写真貼付"));
    }

    @Test
    void resumeEnContainsEnglishSections() {
        Map<String, Object> payload = sampleEn();
        String html = new String(renderer.renderHtml("RESUME_EN", payload), StandardCharsets.UTF_8);
        assertTrue(html.contains("Professional Summary"));
        assertTrue(html.contains("Taro Yamada"));
        assertTrue(html.contains("Spring Boot"));
        assertTrue(html.contains("Education"));
        assertFalse(html.contains("portrait"));
    }

    @Test
    void missingFactsStayBlankNotInvented() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("nameJa", "テスト");
        String html = new String(renderer.renderHtml("RIREKISHO_JA", payload), StandardCharsets.UTF_8);
        assertTrue(html.contains("テスト"));
        assertTrue(html.contains("な　し") || html.contains("なし"));
        assertFalse(html.contains("サンプル大学"));
        assertFalse(html.contains("極めて良好"));
        assertFalse(html.contains("<script"));
    }

    @Test
    void userAdditionalNotesPreferredOverAutoBuiltMotivationBlock() {
        Map<String, Object> payload = sampleJa();
        payload.put("additionalNotes", "本人希望：土日祝休み希望");
        payload.put("selfPr", "短い自己PR");
        String html = new String(renderer.renderHtml("RIREKISHO_JA", payload), StandardCharsets.UTF_8);
        assertTrue(html.contains("本人希望：土日祝休み希望"));
        assertTrue(html.contains("cv-page-1") && html.contains("cv-page-2"));
    }

    @Test
    void untrustedContentIsEscaped() {
        Map<String, Object> payload = sampleJa();
        payload.put("nameJa", "<script>alert(1)</script>");
        payload.put("selfPr", "<img src=x onerror=alert(1)>");
        String html = new String(renderer.renderHtml("RIREKISHO_JA", payload), StandardCharsets.UTF_8);
        assertFalse(html.contains("<script>alert(1)</script>"));
        assertTrue(html.contains("&lt;script&gt;") || html.contains("&lt;img"));
    }

    private static int countOccurrences(String haystack, String needle) {
        int count = 0;
        int idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) >= 0) {
            count++;
            idx += needle.length();
        }
        return count;
    }

    private static Map<String, Object> sampleJa() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("nameJa", "山田　太郎");
        p.put("furigana", "やまだ　たろう");
        p.put("dateOfBirth", "1998-04-15");
        p.put("postalCode", "150-0001");
        p.put("addressText", "東京都渋谷区神宮前1-2-3");
        p.put("phone", "090-1234-5678");
        p.put("email", "taro@example.com");
        p.put("selfPr", "大学でJavaとSpring Bootを学びました。");
        p.put("careerGoals", "ソフトウェアエンジニアとして貢献したいです。");
        p.put("favoriteSubjects", "情報処理");
        p.put("hobbies", "読書");
        p.put("healthStatus", "良好");
        p.put("education", List.of(Map.of(
                "id", "e1",
                "schoolName", "東京工業大学",
                "department", "情報工学科",
                "startYear", 2016,
                "startMonth", 4,
                "endYear", 2020,
                "endMonth", 3,
                "status", "卒業"
        )));
        p.put("workExperience", List.of());
        p.put("certifications", List.of(Map.of("name", "普通自動車第一種運転免許", "year", 2019, "month", 6)));
        return p;
    }

    private static Map<String, Object> sampleEn() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("fullName", "Taro Yamada");
        p.put("email", "taro@example.com");
        p.put("phone", "+81-90-1234-5678");
        p.put("selfPr", "Software engineer focused on Spring Boot and cloud systems.");
        p.put("skills", List.of(Map.of("name", "Java"), Map.of("name", "Spring Boot"), Map.of("name", "AWS")));
        p.put("education", List.of(Map.of("schoolName", "Tokyo Tech", "endYear", 2020, "endMonth", 3)));
        p.put("projects", List.of(Map.of("name", "TRON AI", "description", "Career platform")));
        p.put("workExperience", List.of());
        p.put("certifications", List.of());
        return p;
    }
}
