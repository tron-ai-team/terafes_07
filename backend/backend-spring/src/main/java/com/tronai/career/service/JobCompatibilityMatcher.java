package com.tronai.career.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiFeature;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiRequestContext;
import com.tronai.ai.gateway.provider.GatewayProviderException;
import com.tronai.career.dto.CareerDtos;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.profile.CandidateProfileService;
import com.tronai.career.util.SkillMatchEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Deterministic eligibility + relevance scoring, with optional local Ollama explanation.
 * Score is a relevance estimate — never hiring probability. Unknown requirements are not treated as met.
 */
@Service
public class JobCompatibilityMatcher {

    public static final String SCORE_DISCLOSURE =
            "Relevance estimate based on Candidate Profile overlap — not a hiring probability.";

    private static final Logger log = LoggerFactory.getLogger(JobCompatibilityMatcher.class);

    private final CandidateProfileService candidateProfileService;
    private final AiGateway aiGateway;
    private final ObjectMapper objectMapper;
    private final CareerLanguageHelper languageHelper;

    public JobCompatibilityMatcher(CandidateProfileService candidateProfileService,
                                   AiGateway aiGateway,
                                   ObjectMapper objectMapper,
                                   CareerLanguageHelper languageHelper) {
        this.candidateProfileService = candidateProfileService;
        this.aiGateway = aiGateway;
        this.objectMapper = objectMapper;
        this.languageHelper = languageHelper;
    }

    public CareerDtos.CareerJobResult enrich(Long userId, CareerJobEntity job, CareerDtos.CareerJobResult result,
                                             boolean allowAiExplanation) {
        ProfileSnapshot profile = loadProfile(userId);
        MatchBundle bundle = score(profile, job);
        result.setMatchScore(bundle.score());
        result.setMatchTier(bundle.tier());
        result.setMatchedSkills(bundle.matchedSkills());
        result.setMissingSkills(bundle.missingSkills());
        result.setReasons(bundle.reasons());
        result.setRisks(bundle.risks());
        result.setMatchScoreDisclosure(SCORE_DISCLOSURE);
        if (allowAiExplanation) {
            try {
                List<String> aiNotes = explainWithOllama(userId, profile, job, bundle);
                if (!aiNotes.isEmpty()) {
                    List<String> merged = new ArrayList<>(bundle.reasons());
                    merged.addAll(aiNotes);
                    result.setReasons(merged);
                }
            } catch (Exception e) {
                log.debug("Ollama match explanation skipped: {}", e.getMessage());
            }
        }
        return result;
    }

    public MatchBundle score(ProfileSnapshot profile, CareerJobEntity job) {
        List<String> required = parseSkills(job.getRequiredSkillsJson());
        SkillMatchEngine.MatchAnalysis skillAnalysis = SkillMatchEngine.analyze(
                profile.skills(), required, job.getJapaneseRequirement(), profile.languages(), "en",
                languageHelper);

        int roleScore = roleOverlap(profile.desiredTitles(), job.getTitle(), job.getDescriptionText());
        int locationScore = locationOverlap(profile.preferredLocations(), job.getLocation());
        int skillScore = required.isEmpty()
                ? skillOverlapAgainstText(profile.skills(), job)
                : skillAnalysis.score();
        int gradScore = graduationOverlap(profile.expectedGraduationYear(), job);

        // Weighted relevance (deterministic). Unknown factors contribute neutrally, not as perfect match.
        double weighted = roleScore * 0.35 + skillScore * 0.35 + locationScore * 0.20 + gradScore * 0.10;
        int score = (int) Math.round(weighted);
        score = Math.max(0, Math.min(100, score));

        List<String> risks = new ArrayList<>(skillAnalysis.mandatoryBlockers());
        if (job.getApplicationStatus() == null || "UNKNOWN".equalsIgnoreCase(job.getApplicationStatus())) {
            risks.add("Application status UNKNOWN — verify on the original listing before applying.");
        }
        if (job.getJapaneseRequirement() == null || job.getJapaneseRequirement().isBlank()) {
            risks.add("Japanese language requirement not verified from source.");
        }
        if (job.getInternationalStudentPolicy() == null
                || "UNKNOWN".equalsIgnoreCase(job.getInternationalStudentPolicy())) {
            risks.add("International student hiring policy UNKNOWN.");
        }

        List<String> reasons = new ArrayList<>();
        reasons.add(SCORE_DISCLOSURE);
        reasons.add("Role relevance: " + roleScore + "/100");
        reasons.add("Skill relevance: " + skillScore + "/100");
        reasons.add("Location relevance: " + locationScore + "/100");
        reasons.add("Graduation relevance: " + gradScore + "/100 (UNKNOWN treated as neutral, not eligible)");
        if (!skillAnalysis.matchedSkills().isEmpty()) {
            reasons.add("Matched signals: " + String.join(", ", skillAnalysis.matchedSkills()));
        }
        List<String> textMatched = textSkillHits(profile.skills(), job);
        if (!textMatched.isEmpty()) {
            reasons.add("Skills mentioned in listing text: " + String.join(", ", textMatched));
        }
        List<String> missing = new ArrayList<>(skillAnalysis.missingSkills());
        for (String desired : profile.desiredTitles()) {
            if (desired != null && job.getTitle() != null
                    && !job.getTitle().toLowerCase(Locale.ROOT).contains(desired.toLowerCase(Locale.ROOT))
                    && !containsLoose(job.getTitle(), desired)) {
                // not a hard miss — informational only when no overlap at all
            }
        }
        if (roleScore < 40) {
            missing.add("Desired role title not clearly reflected in listing title");
        }

        String tier = score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW";
        if (!risks.isEmpty() && score >= 75) {
            // Cap overconfidence when critical facts are unverified
            tier = "MEDIUM";
            score = Math.min(score, 74);
        }
        return new MatchBundle(score, tier, textMatched.isEmpty() ? skillAnalysis.matchedSkills() : textMatched,
                missing, reasons, risks);
    }

    private List<String> explainWithOllama(Long userId, ProfileSnapshot profile, CareerJobEntity job,
                                           MatchBundle bundle) {
        String system = """
                You are TRON Career Center's job matcher. Explain relevance only from the provided facts.
                Do NOT invent employer requirements, salaries, visa policies, or application status.
                If a fact is UNKNOWN, say it needs verification.
                Reply as JSON: {"bullets":["...","..."]} with at most 4 short bullets.
                """;
        String user = """
                Candidate skills: %s
                Desired roles: %s
                Preferred locations: %s
                Expected graduation: %s
                Job title: %s
                Company: %s
                Location: %s
                Description: %s
                Application status: %s
                Deterministic score: %d (%s)
                """.formatted(
                profile.skills(),
                profile.desiredTitles(),
                profile.preferredLocations(),
                profile.expectedGraduationYear() == null ? "UNKNOWN" : profile.expectedGraduationYear(),
                job.getTitle(),
                job.getCompany(),
                job.getLocation(),
                truncate(job.getDescriptionText(), 800),
                job.getApplicationStatus() == null ? "UNKNOWN" : job.getApplicationStatus(),
                bundle.score(),
                bundle.tier()
        );
        try {
            AiRequestContext ctx = AiRequestContext.builder()
                    .userId(userId)
                    .feature(AiFeature.CAREER_JOB_MATCHING)
                    .mode(AiMode.FAST)
                    .allowCloud(false)
                    .jsonMode(true)
                    .temperature(0.2)
                    .maxTokens(400)
                    .messages(List.of(
                            new ChatMessage("system", system),
                            new ChatMessage("user", user)
                    ))
                    .build();
            AiGenerationResult result = aiGateway.generate(ctx);
            return parseBullets(result.getText());
        } catch (GatewayProviderException e) {
            return List.of();
        }
    }

    private List<String> parseBullets(String text) {
        if (text == null || text.isBlank()) return List.of();
        try {
            String json = text.trim();
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start >= 0 && end > start) {
                json = json.substring(start, end + 1);
            }
            JsonNode node = objectMapper.readTree(json);
            JsonNode bullets = node.get("bullets");
            if (bullets == null || !bullets.isArray()) return List.of();
            List<String> out = new ArrayList<>();
            bullets.forEach(b -> {
                if (b != null && b.isTextual() && !b.asText().isBlank()) {
                    out.add(b.asText().trim());
                }
            });
            return out.stream().limit(4).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private ProfileSnapshot loadProfile(Long userId) {
        List<String> skills = candidateProfileService.skillNamesForUser(userId);
        List<String> languages = candidateProfileService.languageNamesForUser(userId);
        Map<String, Object> prefs = candidateProfileService.preferencesForUser(userId);
        List<String> titles = stringList(prefs.get("desiredJobTitles"));
        List<String> locs = stringList(prefs.get("preferredPrefectures"));
        if (locs.isEmpty()) locs = stringList(prefs.get("preferredLocations"));
        String grad = prefs.get("expectedGraduationYear") != null
                ? String.valueOf(prefs.get("expectedGraduationYear"))
                : null;
        if (grad != null && grad.isBlank()) grad = null;
        return new ProfileSnapshot(skills, languages, titles, locs, grad);
    }

    private static int roleOverlap(List<String> desired, String title, String description) {
        if (desired == null || desired.isEmpty()) return 55; // neutral when profile silent
        String hay = ((title == null ? "" : title) + " " + (description == null ? "" : description))
                .toLowerCase(Locale.ROOT);
        int hits = 0;
        for (String d : desired) {
            if (d == null || d.isBlank()) continue;
            if (hay.contains(d.toLowerCase(Locale.ROOT)) || containsLoose(title, d)) hits++;
        }
        if (hits == 0) {
            // Soft IT role family match
            if (hay.contains("エンジニア") || hay.contains("プログラマ") || hay.contains("engineer")
                    || hay.contains("developer")) {
                boolean wantsIt = desired.stream().anyMatch(d -> d != null && (
                        d.contains("エンジニア") || d.toLowerCase(Locale.ROOT).contains("engineer")
                                || d.contains("プログラマ") || d.toLowerCase(Locale.ROOT).contains("develop")));
                return wantsIt ? 60 : 35;
            }
            return 30;
        }
        return Math.min(100, 50 + (int) Math.round(50.0 * hits / desired.size()));
    }

    private static int locationOverlap(List<String> preferred, String jobLocation) {
        if (preferred == null || preferred.isEmpty()) return 55;
        if (jobLocation == null || jobLocation.isBlank()) return 50; // unknown location — neutral
        String hay = jobLocation.toLowerCase(Locale.ROOT);
        for (String p : preferred) {
            if (p == null || p.isBlank()) continue;
            if (hay.contains(p.toLowerCase(Locale.ROOT))) return 95;
            if (aliases(p, jobLocation)) return 90;
            if ("nationwide".equalsIgnoreCase(p) || "全国".equals(p)) return 80;
        }
        return 25;
    }

    private static int graduationOverlap(String expectedYear, CareerJobEntity job) {
        if (expectedYear == null || expectedYear.isBlank()) return 55;
        String hay = ((job.getDescriptionText() == null ? "" : job.getDescriptionText()) + " "
                + (job.getTitle() == null ? "" : job.getTitle()));
        if (hay.contains(expectedYear) || hay.contains(expectedYear + "年卒") || hay.contains(expectedYear + "卒")) {
            return 90;
        }
        // CareerMap OG often omits graduation year — neutral, not automatic pass
        return 50;
    }

    private static int skillOverlapAgainstText(List<String> skills, CareerJobEntity job) {
        List<String> hits = textSkillHits(skills, job);
        if (skills == null || skills.isEmpty()) return 50;
        if (hits.isEmpty()) return 40;
        return Math.min(95, 45 + (int) Math.round(50.0 * hits.size() / Math.max(1, Math.min(skills.size(), 8))));
    }

    private static List<String> textSkillHits(List<String> skills, CareerJobEntity job) {
        if (skills == null) return List.of();
        String hay = ((job.getTitle() == null ? "" : job.getTitle()) + " "
                + (job.getDescriptionText() == null ? "" : job.getDescriptionText()) + " "
                + (job.getRequiredSkillsJson() == null ? "" : job.getRequiredSkillsJson()))
                .toLowerCase(Locale.ROOT);
        Set<String> hits = new LinkedHashSet<>();
        for (String s : skills) {
            if (s != null && s.length() >= 2 && hay.contains(s.toLowerCase(Locale.ROOT))) {
                hits.add(s);
            }
        }
        return new ArrayList<>(hits);
    }

    private static boolean aliases(String want, String have) {
        String w = want.toLowerCase(Locale.ROOT);
        String h = have.toLowerCase(Locale.ROOT);
        if ((w.contains("tokyo") || w.contains("東京")) && (h.contains("東京") || h.contains("tokyo"))) return true;
        if ((w.contains("kanagawa") || w.contains("神奈川")) && (h.contains("神奈川") || h.contains("kanagawa"))) return true;
        if ((w.contains("chiba") || w.contains("千葉")) && (h.contains("千葉") || h.contains("chiba"))) return true;
        if ((w.contains("saitama") || w.contains("埼玉")) && (h.contains("埼玉") || h.contains("saitama"))) return true;
        return false;
    }

    private static boolean containsLoose(String title, String desired) {
        if (title == null || desired == null) return false;
        String t = title.toLowerCase(Locale.ROOT);
        String d = desired.toLowerCase(Locale.ROOT);
        if (t.contains(d)) return true;
        if (d.contains("エンジニア") && t.contains("エンジニア")) return true;
        if (d.contains("engineer") && t.contains("engineer")) return true;
        return false;
    }

    private List<String> parseSkills(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory()
                    .constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private static List<String> stringList(Object raw) {
        if (raw instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) {
                if (o != null && !String.valueOf(o).isBlank()) out.add(String.valueOf(o));
            }
            return out;
        }
        if (raw instanceof String s && !s.isBlank()) return List.of(s);
        return List.of();
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }

    public record ProfileSnapshot(List<String> skills, List<String> languages, List<String> desiredTitles,
                           List<String> preferredLocations, String expectedGraduationYear) {}

    public record MatchBundle(int score, String tier, List<String> matchedSkills, List<String> missingSkills,
                       List<String> reasons, List<String> risks) {}
}
