package com.tronai.career;

import com.tronai.career.i18n.CareerLanguageHelper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CareerLanguageHelperTest {

    private final CareerLanguageHelper helper = new CareerLanguageHelper();

    @Test
    void normalizesSupportedLanguages() {
        for (String code : java.util.List.of("en", "ja", "si", "bn", "ne", "my")) {
            assertEquals(code, helper.normalize(code));
            assertFalse(helper.message("match.title", code).isBlank());
        }
        assertEquals("en", helper.normalize("unknown"));
    }

    @Test
    void returnsLocalizedMessage() {
        assertTrue(helper.message("match.title", "ja").contains("マッチ"));
        assertTrue(helper.message("match.title", "en").toLowerCase().contains("match"));
    }
}
