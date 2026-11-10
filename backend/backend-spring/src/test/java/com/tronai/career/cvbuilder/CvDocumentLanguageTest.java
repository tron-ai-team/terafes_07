package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CvDocumentLanguageTest {

    @Test
    void templateDrivesLanguage() {
        assertEquals("ja", CvDocumentLanguage.requiredLanguage("RIREKISHO_JA"));
        assertEquals("ja", CvDocumentLanguage.requiredLanguage("SHOKUMU_JA"));
        assertEquals("en", CvDocumentLanguage.requiredLanguage("RESUME_EN"));
    }

    @Test
    void japaneseSelfPrAcceptedWithTechTerms() {
        String text = "大学でJavaとSpring Bootを学び、AWS上のMySQL運用にも携わりました。丁寧なコミュニケーションを心がけています。";
        assertTrue(CvDocumentLanguage.matchesRequiredLanguage(text, "ja"));
    }

    @Test
    void englishSelfPrRejectedForJapaneseTemplate() {
        String text = "I am a motivated software engineer with experience in Java and Spring Boot. I communicate well.";
        assertFalse(CvDocumentLanguage.matchesRequiredLanguage(text, "ja"));
    }

    @Test
    void englishSummaryAccepted() {
        String text = "Results-driven software engineer with experience delivering Spring Boot services on AWS.";
        assertTrue(CvDocumentLanguage.matchesRequiredLanguage(text, "en"));
    }

    @Test
    void japaneseRejectedForEnglishTemplate() {
        String text = "私は責任感を持ち、チーム開発で貢献できるエンジニアです。日本語で自己PRを記載しています。";
        assertFalse(CvDocumentLanguage.matchesRequiredLanguage(text, "en"));
    }
}
