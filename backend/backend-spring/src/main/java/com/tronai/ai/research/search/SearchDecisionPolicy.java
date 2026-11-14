package com.tronai.ai.research.search;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Deterministic OFF/AUTO/ON search policy. AUTO uses heuristics only — no paid classifier call.
 */
@Component
public class SearchDecisionPolicy {

    private static final Pattern PRIVATE_SIGNAL = Pattern.compile(
            "(?i)\\b(my\\s+(resume|cv|email|phone|address|ssn|password|token)|私の(履歴書|職務経歴|メール|電話)|@\\w+\\.\\w+)\\b"
                    + "|\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b");

    private static final Pattern GREETING = Pattern.compile(
            "(?i)^(hi|hello|hey|yo|thanks|thank you|ok|okay|こんにちは|おはよう|ありがとう|どうも)[!.?\\s]*$");

    private static final Pattern MATH_OR_CODE_LOCAL = Pattern.compile(
            "(?i)^(what is|what's|compute|calculate)?\\s*\\d+[\\d\\s+\\-*/().%^=]*$"
                    + "|\\b(fibonacci|binary search|quicksort|hello world)\\b");

    private static final Pattern CURRENT_EVENTS = Pattern.compile(
            "(?i)(\\b(today|tonight|yesterday|this week|this month|latest|current|currently|right now|live|"
                    + "breaking|news|price of|stock|weather|who won|score|release date|version|"
                    + "as of|update on|look up|search for|google|web search)\\b|"
                    + "今日|最新|現在|調べて|検索|ニュース|相場|天気)");

    private final WebSearchProperties properties;

    public SearchDecisionPolicy(WebSearchProperties properties) {
        this.properties = properties;
    }

    public SearchDecision decide(String rawSearchMode, String userText) {
        ResolvedSearchMode mode = ResolvedSearchMode.fromRaw(rawSearchMode);
        String text = userText == null ? "" : userText.trim();
        boolean privateSignals = PRIVATE_SIGNAL.matcher(text).find();

        if (mode == ResolvedSearchMode.OFF) {
            return SearchDecision.skip(mode, "Search is turned off");
        }
        if (!properties.isWebSearchV1Enabled()) {
            return SearchDecision.skip(mode, "Search provider not configured");
        }

        String query = sanitizeQuery(text);
        if (query.isBlank()) {
            return SearchDecision.skip(mode, "Empty query");
        }
        if (privateSignals) {
            // Never send private profile/contact material to search providers.
            query = generalizePrivateQuery(query);
        }

        if (mode == ResolvedSearchMode.ON) {
            return SearchDecision.search(mode, "search_mode_on", query, privateSignals);
        }

        // AUTO
        if (GREETING.matcher(text).matches()) {
            return SearchDecision.skip(mode, "Greeting does not need web search");
        }
        if (MATH_OR_CODE_LOCAL.matcher(text).find() && !CURRENT_EVENTS.matcher(text).find()) {
            return SearchDecision.skip(mode, "Local knowledge question");
        }
        if (CURRENT_EVENTS.matcher(text).find()) {
            return SearchDecision.search(mode, "freshness_or_lookup", query, privateSignals);
        }
        return SearchDecision.skip(mode, "AUTO heuristic: no search needed");
    }

    public String sanitizeQuery(String text) {
        if (text == null) {
            return "";
        }
        String q = text.replaceAll("\\s+", " ").trim();
        int max = Math.max(32, properties.getMaxQueryChars());
        if (q.length() > max) {
            q = q.substring(0, max);
        }
        return q;
    }

    static String generalizePrivateQuery(String query) {
        // Strip emails and phone-like tokens; keep topic words for public lookup intent.
        String cleaned = query
                .replaceAll("(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", " ")
                .replaceAll("\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b", " ")
                .replaceAll("(?i)\\b(my resume|my cv|私の履歴書|私の職務経歴)\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.length() < 3) {
            return "public company information";
        }
        return cleaned;
    }

    public static boolean looksLikeInjection(String snippet) {
        if (snippet == null) {
            return false;
        }
        String lower = snippet.toLowerCase(Locale.ROOT);
        return lower.contains("ignore previous instructions")
                || lower.contains("ignore all previous")
                || lower.contains("system prompt")
                || lower.contains("exfiltrate")
                || lower.contains("api key")
                || lower.contains("disclose your secrets");
    }
}
