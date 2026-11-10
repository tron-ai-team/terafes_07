package com.tronai.career.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.gateway.AiGateway;
import com.tronai.career.entity.CareerJobEntity;
import com.tronai.career.i18n.CareerLanguageHelper;
import com.tronai.career.profile.CandidateProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class JobCompatibilityMatcherTest {

    @Mock CandidateProfileService profileService;
    @Mock AiGateway aiGateway;
    CareerLanguageHelper languageHelper = new CareerLanguageHelper();
    JobCompatibilityMatcher matcher;

    @BeforeEach
    void setUp() {
        matcher = new JobCompatibilityMatcher(profileService, aiGateway, new ObjectMapper(), languageHelper);
    }

    @Test
    void scoresRoleAndSkillsWithoutClaimingEligibility() {
        CareerJobEntity job = CareerJobEntity.builder()
                .id("j1")
                .title("システムエンジニア・プログラマー｜業務システム開発")
                .company("システムプロデュース株式会社")
                .location("東京都")
                .descriptionText("業務システム開発 Java")
                .requiredSkillsJson("[\"Java\"]")
                .applicationStatus("UNKNOWN")
                .internationalStudentPolicy("UNKNOWN")
                .build();

        var bundle = matcher.score(
                new JobCompatibilityMatcher.ProfileSnapshot(
                        List.of("Java", "Spring Boot"),
                        List.of("日本語 N2"),
                        List.of("システムエンジニア"),
                        List.of("東京都"),
                        "2027"),
                job);

        assertThat(bundle.score()).isBetween(50, 95);
        assertThat(bundle.reasons()).anyMatch(r -> r.contains("Relevance estimate"));
        assertThat(bundle.risks()).anyMatch(r -> r.contains("Application status UNKNOWN"));
        // Must not invent a fake 98% certainty score
        assertThat(bundle.score()).isNotEqualTo(98);
    }

    @Test
    void unknownLocationIsNeutralNotPerfect() {
        var bundle = matcher.score(
                new JobCompatibilityMatcher.ProfileSnapshot(
                        List.of(), List.of(), List.of("Webエンジニア"), List.of("東京都"), null),
                CareerJobEntity.builder()
                        .id("j2")
                        .title("Webエンジニア")
                        .company("Example")
                        .location("")
                        .descriptionText("")
                        .applicationStatus("UNKNOWN")
                        .build());
        assertThat(bundle.score()).isLessThan(90);
    }
}
