package com.tronai.career.util;

import com.tronai.career.dto.CareerDtos;

import java.util.*;
import java.util.stream.Collectors;

public final class SkillMatchEngine {

    private SkillMatchEngine() {}

    public record MatchAnalysis(
            int score,
            String tier,
            List<String> matchedSkills,
            List<String> missingSkills,
            List<String> mandatoryBlockers,
            List<String> strengths,
            List<String> gaps,
            List<String> reasons,
            List<String> improvements,
            Map<String, Object> rubric
    ) {}

    public static MatchAnalysis analyze(List<String> candidateSkills, List<String> requiredSkills,
                                          String japaneseRequirement, List<String> candidateLanguages,
                                          String languageCode, com.tronai.career.i18n.CareerLanguageHelper i18n) {
        Set<String> candidate = normalizeSet(candidateSkills);
        Set<String> required = normalizeSet(requiredSkills);
        List<String> matched = required.stream().filter(candidate::contains).collect(Collectors.toList());
        List<String> missing = required.stream().filter(s -> !candidate.contains(s)).collect(Collectors.toList());

        int base = required.isEmpty() ? 50 : (int) Math.round(100.0 * matched.size() / required.size());
        List<String> blockers = new ArrayList<>();
        if (japaneseRequirement != null && !japaneseRequirement.isBlank()) {
            boolean hasJa = candidateLanguages != null && candidateLanguages.stream()
                    .anyMatch(l -> l.toLowerCase(Locale.ROOT).contains("japanese") || l.contains("日本語"));
            if (!hasJa && japaneseRequirement.toLowerCase(Locale.ROOT).contains("required")) {
                blockers.add(i18n.message("match.blocker.japanese", languageCode));
                base = Math.min(base, 45);
            }
        }

        String tier = base >= 75 ? "HIGH" : base >= 50 ? "MEDIUM" : "LOW";
        if (!blockers.isEmpty()) {
            tier = "LOW";
        }

        List<String> strengths = matched.isEmpty()
                ? List.of()
                : List.of("Matched skills: " + String.join(", ", matched));
        List<String> gaps = missing.isEmpty()
                ? List.of()
                : List.of("Missing skills: " + String.join(", ", missing));
        List<String> reasons = new ArrayList<>();
        reasons.add(i18n.message("match.title", languageCode));
        reasons.add("Score based on " + matched.size() + "/" + Math.max(required.size(), 1) + " required skills");
        if (!blockers.isEmpty()) {
            reasons.addAll(blockers);
        }

        List<String> improvements = missing.stream()
                .limit(5)
                .map(skill -> "Highlight or acquire experience with: " + skill)
                .collect(Collectors.toList());

        Map<String, Object> rubric = Map.of(
                "skillCoverage", required.isEmpty() ? 0.5 : (double) matched.size() / required.size(),
                "mandatoryBlockers", blockers.size(),
                "tier", tier
        );

        return new MatchAnalysis(base, tier, matched, missing, blockers, strengths, gaps, reasons, improvements, rubric);
    }

    private static Set<String> normalizeSet(List<String> skills) {
        if (skills == null) {
            return Set.of();
        }
        return skills.stream()
                .filter(Objects::nonNull)
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public static CareerDtos.CareerJobResult applyMatchToJob(CareerDtos.CareerJobResult job, MatchAnalysis analysis) {
        job.setMatchScore(analysis.score());
        job.setMatchTier(analysis.tier());
        job.setMatchedSkills(analysis.matchedSkills());
        job.setMissingSkills(analysis.missingSkills());
        job.setReasons(analysis.reasons());
        job.setRisks(analysis.mandatoryBlockers());
        return job;
    }
}
