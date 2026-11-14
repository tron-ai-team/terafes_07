package com.tronai.ai.research.search;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Deterministic OFF/AUTO/ON search policy. AUTO uses heuristics only — no paid classifier call.
 * Conservative skip when sensitive personal data cannot be safely generalized for public search.
 */
@Component
public class SearchDecisionPolicy {

    private static final Pattern EMAIL = Pattern.compile(
            "(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}");

    private static final Pattern PHONE = Pattern.compile(
            "(?i)\\b\\d{3}[-.]\\d{3}[-.]\\d{4}\\b"
                    + "|\\+\\d{1,3}[\\s.-]\\d{2,4}[\\s.-]\\d{3,4}[\\s.-]\\d{3,4}"
                    + "|0\\d{1,4}-\\d{1,4}-\\d{3,4}");

    private static final Pattern CREDENTIAL = Pattern.compile(
            "(?i)\\b(password|passwd|passphrase|secret\\s*key|api[_\\s-]?key|access[_\\s-]?token|"
                    + "refresh[_\\s-]?token|bearer\\s+[a-z0-9._\\-]{8,}|authorization:\\s*bearer|"
                    + "sk-[a-z0-9]{10,}|ghp_[a-z0-9]{20,}|xox[baprs]-[a-z0-9-]{10,})\\b");

    private static final Pattern ADDRESS = Pattern.compile(
            "(?i)\\b(\\d{1,5}\\s+[\\w.\\-]+\\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\\b)"
                    + "|\\b(住所|番地|マンション|アパート)\\b");

    private static final Pattern PROFILE_OR_CV = Pattern.compile(
            "(?i)\\b(my\\s+(resume|cv|curriculum\\s+vitae|candidate\\s+profile|profile\\s+details|"
                    + "phone|email|address|ssn|passport|national\\s*id|date\\s+of\\s+birth|dob))"
                    + "|\\b(candidate\\s+profile|upload(ed)?\\s+(cv|resume)|cv\\s+content|resume\\s+text)\\b"
                    + "|私の(履歴書|職務経歴|プロフィール|メール|電話|住所|マイナンバー)"
                    + "|履歴書|職務経歴書"
                    + "|මගේ\\s*(CV|resume|ඊමේල්|දුරකථන|ලිපිනය)"
                    + "|ජාතික\\s*හැඳුනුම්පත");

    private static final Pattern HARD_PRIVATE = Pattern.compile(
            CREDENTIAL.pattern() + "|" + PROFILE_OR_CV.pattern() + "|" + ADDRESS.pattern());

    private static final Pattern PRIVATE_SIGNAL = Pattern.compile(
            EMAIL.pattern() + "|" + PHONE.pattern() + "|" + HARD_PRIVATE.pattern());

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
        boolean privateSignals = containsPrivateSignals(text);

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
            // Credentials, CV/profile dumps, and addresses: never send to public search.
            if (HARD_PRIVATE.matcher(text).find()) {
                return SearchDecision.skip(mode,
                        "Private or credential content cannot be safely searched");
            }
            query = generalizePrivateQuery(query);
            if (query.isBlank() || containsPrivateSignals(query) || query.length() < 8) {
                return SearchDecision.skip(mode,
                        "Private signals could not be safely generalized for search");
            }
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

    static boolean containsPrivateSignals(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return PRIVATE_SIGNAL.matcher(text).find();
    }

    static String generalizePrivateQuery(String query) {
        // Strip emails, phones, and explicit private self-references; keep public topic words.
        String cleaned = query
                .replaceAll(EMAIL.pattern(), " ")
                .replaceAll(PHONE.pattern(), " ")
                .replaceAll(CREDENTIAL.pattern(), " ")
                .replaceAll(ADDRESS.pattern(), " ")
                .replaceAll(PROFILE_OR_CV.pattern(), " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (cleaned.length() < 8) {
            return "";
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
                || lower.contains("disclose your secrets")
                || lower.contains("override safety")
                || lower.contains("jailbreak");
    }
}
