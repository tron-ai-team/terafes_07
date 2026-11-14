package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiGatewayProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Real Spring Boot configuration binding for SearXNG production activation.
 * Loads classpath {@code application.yml} / {@code application-prod.yml} through
 * ConfigData — not hand-built property objects.
 */
class SearxngProductionConfigBootTest {

    private final ApplicationContextRunner baseRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withUserConfiguration(SearchConfigBeans.class)
            .withPropertyValues(
                    "spring.main.banner-mode=off",
                    // Satisfy required prod placeholders so ConfigData can load the full files.
                    "JWT_SECRET=test-secret-key-at-least-256-bits-long-32-bytes-testing",
                    "DB_HOST=127.0.0.1",
                    "DB_USERNAME=sa",
                    "DB_PASSWORD=test",
                    "CORS_ALLOWED_ORIGINS=http://localhost:5174",
                    "TRON_FRONTEND_URL=http://localhost:5174",
                    "TRON_PUBLIC_API_URL=http://localhost:8080"
            );

    @Test
    @DisplayName("Default profile keeps master search and SearXNG disabled")
    void defaultProfileKeepsSearchDisabled() {
        baseRunner.run(context -> {
            WebSearchProperties search = context.getBean(WebSearchProperties.class);
            assertThat(search.isWebSearchV1Enabled()).isFalse();
            assertThat(search.getSearxng().isEnabled()).isFalse();
            assertThat(search.getSearxng().isReady()).isFalse();
            assertPaidOff(search);
        });
    }

    @Test
    @DisplayName("Production profile enables private SearXNG at tron-searxng:8080")
    void productionProfileEnablesSearxng() {
        baseRunner.withPropertyValues("spring.profiles.active=prod").run(context -> {
            WebSearchProperties search = context.getBean(WebSearchProperties.class);
            assertThat(search.isWebSearchV1Enabled()).isTrue();
            assertThat(search.getSearxng().isEnabled()).isTrue();
            assertThat(search.getSearxng().getBaseUrl()).isEqualTo("http://tron-searxng:8080");
            assertThat(search.getSearxng().isReady()).isTrue();
            assertPaidOff(search);
        });
    }

    @Test
    @DisplayName("TRON_WEB_SEARCH_V1_ENABLED=false overrides production defaults")
    void masterFlagFalseOverridesProduction() {
        baseRunner.withPropertyValues(
                "spring.profiles.active=prod",
                "TRON_WEB_SEARCH_V1_ENABLED=false"
        ).run(context -> {
            WebSearchProperties search = context.getBean(WebSearchProperties.class);
            assertThat(search.isWebSearchV1Enabled()).isFalse();
            // SearXNG may still be marked enabled in YAML, but master flag gates orchestration.
            assertThat(search.getSearxng().getBaseUrl()).isEqualTo("http://tron-searxng:8080");
            assertPaidOff(search);
        });
    }

    @Test
    @DisplayName("Paid search remains disabled under production profile")
    void paidSearchRemainsDisabledInProduction() {
        baseRunner.withPropertyValues("spring.profiles.active=prod").run(context -> {
            WebSearchProperties search = context.getBean(WebSearchProperties.class);
            assertPaidOff(search);
            assertThat(search.getSerper().isReady()).isFalse();
        });
    }

    @Test
    @DisplayName("Production search activation does not change FAST/SMART gateway lock defaults")
    void fastSmartGatewayDefaultsUnchangedBySearchActivation() {
        baseRunner.withPropertyValues("spring.profiles.active=prod").run(context -> {
            AiGatewayProperties gateway = context.getBean(AiGatewayProperties.class);
            // Search YAML must not rewrite GTX/RTX lock keys; defaults remain env-driven false
            // unless the operator sets TRON_AI_GTX_FAST_MODE / TRON_AI_RTX_SMART_MODE.
            assertThat(gateway.isGtxFastModeEnabled()).isFalse();
            assertThat(gateway.isRtxSmartModeEnabled()).isFalse();
            assertThat(gateway.getGtxFastModel()).isEqualTo("qwen3:8b");
            assertThat(gateway.getRtxSmartModel()).isEqualTo("qwen3.5:9b-q4_K_M");

            WebSearchProperties search = context.getBean(WebSearchProperties.class);
            assertThat(search.isWebSearchV1Enabled()).isTrue();
            assertThat(search.getSearxng().isReady()).isTrue();
        });
    }

    private static void assertPaidOff(WebSearchProperties search) {
        assertThat(search.isLocalPaidFallbackEnabled()).isFalse();
        assertThat(search.getSerper().isEnabled()).isFalse();
        assertThat(search.getSerper().getDailyMaxCalls()).isZero();
        assertThat(search.getGroqNative().isBrowserSearchEnabled()).isFalse();
        assertThat(search.getOpenRouterNative().isWebSearchToolEnabled()).isFalse();
    }

    @Configuration
    @EnableConfigurationProperties({WebSearchProperties.class, AiGatewayProperties.class})
    static class SearchConfigBeans {
    }
}
