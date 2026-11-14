package com.tronai.chat;

import com.tronai.ai.research.search.SearchBundle;
import com.tronai.ai.research.search.SearchGrounding;
import com.tronai.language.ExperienceLanguage;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Service for multilingual detection, normalization, and system prompt generation.
 */
@Service
public class LanguageService {

    public static final Map<String, String> SUPPORTED_LANGUAGES = supportedNames();

    private static final Pattern SINHALA = Pattern.compile("[\\u0D80-\\u0DFF]");
    private static final Pattern BENGALI = Pattern.compile("[\\u0980-\\u09FF]");
    private static final Pattern DEVANAGARI = Pattern.compile("[\\u0900-\\u097F]");
    private static final Pattern MYANMAR = Pattern.compile("[\\u1000-\\u109F]");
    private static final Pattern KANA = Pattern.compile("[\\u3040-\\u30FF]");
    private static final Pattern KANJI = Pattern.compile("[\\u4E00-\\u9FFF]");

    private static Map<String, String> supportedNames() {
        Map<String, String> names = new LinkedHashMap<>();
        for (ExperienceLanguage language : ExperienceLanguage.values()) {
            names.put(language.code(), language.englishName());
        }
        return Map.copyOf(names);
    }

    public String normalize(String value) {
        ExperienceLanguage language = ExperienceLanguage.parse(value);
        return language == null ? null : language.code();
    }

    public boolean isSupported(String code) {
        return code != null && SUPPORTED_LANGUAGES.containsKey(code);
    }

    public String detect(String text) {
        if (text == null) {
            return "en";
        }
        if (SINHALA.matcher(text).find()) {
            return "si";
        }
        if (BENGALI.matcher(text).find()) {
            return "bn";
        }
        if (KANA.matcher(text).find() || KANJI.matcher(text).find()) {
            return "ja";
        }
        if (MYANMAR.matcher(text).find()) {
            return "my";
        }
        if (DEVANAGARI.matcher(text).find()) {
            return "ne";
        }
        return "en";
    }

    public String resolveLanguage(String requested, String text) {
        String norm = normalize(requested);
        if (norm != null) {
            return norm;
        }
        return detect(text);
    }

    public String buildSystemPrompt(String language) {
        return buildSystemPrompt(language, "auto", null);
    }

    public String buildSystemPrompt(String language, String searchMode) {
        return buildSystemPrompt(language, searchMode, null);
    }

    public String buildSystemPrompt(String language, String searchMode, SearchBundle searchBundle) {
        String langName = SUPPORTED_LANGUAGES.getOrDefault(language, "English");
        SearchBundle effective = searchBundle;
        if (effective == null) {
            var mode = com.tronai.ai.research.search.ResolvedSearchMode.fromRaw(searchMode);
            effective = mode == com.tronai.ai.research.search.ResolvedSearchMode.OFF
                    ? SearchBundle.skipped(mode, "Search is turned off")
                    : SearchBundle.unavailable(mode, "Search provider not configured");
        }
        String searchNote = SearchGrounding.systemSearchNote(effective);

        return "You are TRON AI, a careful local assistant. "
                + "Reply only in " + langName + ", even if the user writes in another language. Do not mix languages. "
                + "Do not translate fenced code or text the user placed in quotes. Leave that content unchanged. "
                + "Do not default to Japanese unless Japanese is the selected language. "
                + "Match the length to the request: answer a short question briefly, and answer a coding or "
                + "explanation request completely. Use fenced Markdown for code, keep its indentation, and close every fence. "
                + "Be honest when you do not know. Prefer step-by-step reasoning for complex tasks, concise answers for simple ones. "
                + "Do not invent tools, citations, company facts, education, work experience, or search results. "
                + "Do not act as a job interviewer. Use only this conversation plus the search note below. "
                + searchNote;
    }
}
