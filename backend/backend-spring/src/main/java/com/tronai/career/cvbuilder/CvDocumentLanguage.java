package com.tronai.career.cvbuilder;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Document language is derived from the CV template — never from browser/UI locale.
 */
public final class CvDocumentLanguage {

    private static final Pattern CJK = Pattern.compile("[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff]");
    private static final Pattern LATIN_WORD = Pattern.compile("[A-Za-z]{3,}");

    private CvDocumentLanguage() {}

    /** Required narrative language for a template. */
    public static String requiredLanguage(String templateCode) {
        if (templateCode == null) return "en";
        String t = templateCode.trim().toUpperCase(Locale.ROOT);
        if ("RIREKISHO_JA".equals(t) || "SHOKUMU_JA".equals(t) || t.contains("RIREKISHO") || t.contains("SHOKUMU")) {
            return "ja";
        }
        return "en";
    }

    public static boolean isJapaneseRequired(String templateCode) {
        return "ja".equals(requiredLanguage(templateCode));
    }

    /**
     * Heuristic language check for AI narrative text.
     * Technical English tokens (Java, Spring Boot, AWS) are allowed inside Japanese text.
     */
    public static boolean matchesRequiredLanguage(String text, String requiredLang) {
        if (text == null || text.isBlank()) return true;
        String t = text.trim();
        long cjk = CJK.matcher(t).results().count();
        long latinWords = LATIN_WORD.matcher(t).results().count();
        // Strip common tech tokens before latin count for Japanese docs
        String stripped = t
                .replaceAll("(?i)\\b(java|spring\\s*boot|spring|aws|mysql|postgresql|docker|kubernetes|react|typescript|javascript|python|git|linux|html|css|api|rest|json|http|https|openai|ollama)\\b", " ");
        long latinAfterTech = LATIN_WORD.matcher(stripped).results().count();

        if ("ja".equals(requiredLang)) {
            // Need some CJK; allow tech English. Reject mostly-English prose.
            if (cjk >= 8) return true;
            if (cjk >= 3 && latinAfterTech <= cjk * 2) return true;
            // Short Japanese phrases
            if (cjk >= 2 && t.length() <= 40 && latinAfterTech <= 2) return true;
            return false;
        }
        // English: must have Latin words; reject CJK-dominant text
        if (cjk > latinWords && cjk >= 8) return false;
        return latinWords >= 3 || (latinWords >= 1 && cjk == 0);
    }

    public static String languageLabel(String lang) {
        return "ja".equals(lang) ? "Japanese" : "English";
    }
}
