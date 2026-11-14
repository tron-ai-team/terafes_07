package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.profile.AiProfile;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Versioned production activation safety: global defaults stay OFF; prod profile
 * enables private SearXNG only; env kill-switch and paid paths stay safe.
 */
@ExtendWith(MockitoExtension.class)
class SearxngProductionActivationTest {

    @Mock SearxngSearchClient searxng;
    @Mock SerperSearchClient serper;
    @Mock SearchCache cache;

    @Test
    @DisplayName("application.yml keeps master search and SearXNG disabled by default")
    void defaultYamlSearchDisabled() {
        Map<String, Object> search = searchSection("application.yml");
        assertThat(placeholderDefault(search.get("web-search-v1-enabled"))).isEqualTo("false");
        @SuppressWarnings("unchecked")
        Map<String, Object> searxng = (Map<String, Object>) search.get("searxng");
        assertThat(placeholderDefault(searxng.get("enabled"))).isEqualTo("false");
        assertThat(String.valueOf(searxng.get("base-url"))).contains("127.0.0.1:8888");
        assertPaidPathsOff(search);
    }

    @Test
    @DisplayName("application-prod.yml activates private SearXNG with paid paths off")
    void prodYamlActivatesPrivateSearxng() {
        Map<String, Object> search = searchSection("application-prod.yml");
        assertThat(placeholderDefault(search.get("web-search-v1-enabled"))).isEqualTo("true");
        @SuppressWarnings("unchecked")
        Map<String, Object> searxngCfg = (Map<String, Object>) search.get("searxng");
        assertThat(placeholderDefault(searxngCfg.get("enabled"))).isEqualTo("true");
        assertThat(placeholderDefault(searxngCfg.get("base-url")))
                .isEqualTo("http://tron-searxng:8080");
        assertThat(placeholderDefault(search.get("local-paid-fallback-enabled"))).isEqualTo("false");
        assertPaidPathsOff(search);
    }

    @Test
    @DisplayName("Explicit master flag=false overrides production-enabled properties")
    void explicitMasterFalseOverridesProdDefaults() {
        WebSearchProperties props = productionLikeProperties();
        props.setWebSearchV1Enabled(false); // simulates TRON_WEB_SEARCH_V1_ENABLED=false

        SearchOrchestrator orchestrator = orchestrator(props);
        SearchBundle bundle = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.FAST);

        assertThat(bundle.status()).isEqualTo("unavailable");
        assertThat(bundle.detail()).isEqualTo("Search provider not configured");
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("Prod-like config uses SearXNG for FAST/SMART and never Serper")
    void prodLikeFastSmartUseSearxngOnly() {
        WebSearchProperties props = productionLikeProperties();
        when(searxng.isConfigured()).thenReturn(true);
        when(searxng.search(anyString(), anyString(), anyInt())).thenReturn(new ProviderSearchOutcome(
                "SEARXNG", "q", true, "ok", "ok",
                List.of(new NormalizedSearchHit("T", "https://example.com", "S",
                        "SEARXNG", "google", null, Instant.now(), null)),
                8L, null));

        SearchOrchestrator orchestrator = orchestrator(props);
        SearchBundle fast = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.FAST);
        SearchBundle smart = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.SMART);

        assertThat(fast.provider()).isEqualTo("SEARXNG");
        assertThat(smart.provider()).isEqualTo("SEARXNG");
        assertThat(fast.useNativeCloudTool()).isFalse();
        assertThat(smart.useNativeCloudTool()).isFalse();
        verify(serper, never()).search(anyString(), anyInt());
        verify(serper, never()).isConfigured();
    }

    @Test
    @DisplayName("Prod-like config does not silently use paid fallback when SearXNG fails")
    void noSilentPaidFallback() {
        WebSearchProperties props = productionLikeProperties();
        when(searxng.isConfigured()).thenReturn(true);
        when(searxng.search(anyString(), anyString(), anyInt())).thenReturn(
                ProviderSearchOutcome.failed("SEARXNG", "q", "unavailable", "down"));

        SearchBundle bundle = orchestrator(props)
                .orchestrate("on", "latest news today", "en", AiProfile.SMART);

        assertThat(bundle.succeeded()).isFalse();
        verify(serper, never()).search(anyString(), anyInt());
    }

    @Test
    @DisplayName("Search OFF remains skipped under prod-like properties")
    void offStillSkipped() {
        SearchBundle bundle = orchestrator(productionLikeProperties())
                .orchestrate("off", "latest news today", "en", AiProfile.FAST);
        assertThat(bundle.status()).isEqualTo("skipped");
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("Privacy protections remain active with prod-like search enabled")
    void privacyStillBlocksCredentialsAndCv() {
        SearchDecisionPolicy policy = new SearchDecisionPolicy(productionLikeProperties());
        assertThat(policy.decide("on", "search my password hunter2").shouldSearch()).isFalse();
        assertThat(policy.decide("on", "私の履歴書を検索して").shouldSearch()).isFalse();
        assertThat(policy.decide("on", "look up Acme Corp alice@example.com stock price today").shouldSearch()).isTrue();
        assertThat(policy.decide("on", "look up Acme Corp alice@example.com stock price today")
                .sanitizedQuery()).doesNotContain("alice@example.com");
    }

    private SearchOrchestrator orchestrator(WebSearchProperties props) {
        AiGatewayProperties gw = new AiGatewayProperties();
        gw.setGtxFastModeEnabled(true);
        gw.setRtxSmartModeEnabled(true);
        return new SearchOrchestrator(
                props,
                new SearchDecisionPolicy(props),
                searxng,
                serper,
                cache,
                new CloudNativeSearchSupport(props, gw));
    }

    private static WebSearchProperties productionLikeProperties() {
        WebSearchProperties props = new WebSearchProperties();
        props.setWebSearchV1Enabled(true);
        props.setLocalPaidFallbackEnabled(false);
        props.getSearxng().setEnabled(true);
        props.getSearxng().setBaseUrl("http://tron-searxng:8080");
        props.getSerper().setEnabled(false);
        props.getSerper().setDailyMaxCalls(0);
        props.getGroqNative().setBrowserSearchEnabled(false);
        props.getOpenRouterNative().setWebSearchToolEnabled(false);
        return props;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> searchSection(String resource) {
        Map<String, Object> root = loadYaml(resource);
        Map<String, Object> tron = (Map<String, Object>) root.get("tron");
        assertThat(tron).as("tron section in %s", resource).isNotNull();
        Map<String, Object> search = (Map<String, Object>) tron.get("search");
        assertThat(search).as("tron.search in %s", resource).isNotNull();
        return search;
    }

    @SuppressWarnings("unchecked")
    private static void assertPaidPathsOff(Map<String, Object> search) {
        Map<String, Object> serper = (Map<String, Object>) search.get("serper");
        if (serper != null && serper.get("enabled") != null) {
            assertThat(placeholderDefault(serper.get("enabled"))).isEqualTo("false");
        }
        if (serper != null && serper.get("daily-max-calls") != null) {
            assertThat(placeholderDefault(serper.get("daily-max-calls"))).isIn("0", "0.0");
        }
        Map<String, Object> groq = (Map<String, Object>) search.get("groq-native");
        if (groq != null && groq.get("browser-search-enabled") != null) {
            assertThat(placeholderDefault(groq.get("browser-search-enabled"))).isEqualTo("false");
        }
        Map<String, Object> or = (Map<String, Object>) search.get("open-router-native");
        if (or != null && or.get("web-search-tool-enabled") != null) {
            assertThat(placeholderDefault(or.get("web-search-tool-enabled"))).isEqualTo("false");
        }
    }

    private static Map<String, Object> loadYaml(String classpathName) {
        String path = "/" + classpathName;
        InputStream in = SearxngProductionActivationTest.class.getResourceAsStream(path);
        assertThat(in).as("classpath resource %s", path).isNotNull();
        Object loaded = new Yaml().load(in);
        assertThat(loaded).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = new LinkedHashMap<>((Map<String, Object>) loaded);
        return map;
    }

    /**
     * Extracts the default half of {@code ${ENV:default}} Spring placeholders.
     */
    private static String placeholderDefault(Object raw) {
        String value = String.valueOf(raw).trim();
        if (value.startsWith("${") && value.endsWith("}") && value.contains(":")) {
            int colon = value.indexOf(':');
            return value.substring(colon + 1, value.length() - 1).trim();
        }
        return value;
    }
}
