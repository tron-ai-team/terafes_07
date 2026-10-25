package com.tronai.career;

import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.util.SkillMatchEngine;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SkillMatchEngineTest {

    private final CareerLanguageHelper i18n = new CareerLanguageHelper();

    @Test
    void scoresSkillOverlap() {
        SkillMatchEngine.MatchAnalysis analysis = SkillMatchEngine.analyze(
                List.of("java", "spring boot"),
                List.of("java", "spring boot", "mysql"),
                null,
                List.of("English"),
                "en",
                i18n
        );
        assertEquals(67, analysis.score());
        assertEquals("MEDIUM", analysis.tier());
        assertTrue(analysis.missingSkills().contains("mysql"));
    }
}
