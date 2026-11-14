package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.profile.AiProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchOrchestratorTest {

    @Mock SearxngSearchClient searxng;
    @Mock SerperSearchClient serper;
    @Mock SearchCache cache;

    WebSearchProperties properties;
    SearchDecisionPolicy policy;
    CloudNativeSearchSupport nativeSupport;
    SearchOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        properties = new WebSearchProperties();
        properties.setWebSearchV1Enabled(true);
        properties.getSearxng().setEnabled(true);
        properties.getSearxng().setBaseUrl("http://127.0.0.1:8888");
        policy = new SearchDecisionPolicy(properties);
        nativeSupport = new CloudNativeSearchSupport(properties, new AiGatewayProperties());
        orchestrator = new SearchOrchestrator(properties, policy, searxng, serper, cache, nativeSupport);
    }

    @Test
    @DisplayName("OFF guarantees zero provider calls")
    void offZeroCalls() {
        SearchBundle b = orchestrator.orchestrate("off", "latest news today", "en", AiProfile.FAST);
        assertThat(b.status()).isEqualTo("skipped");
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("V1 disabled preserves legacy unavailable stub")
    void v1DisabledLegacy() {
        properties.setWebSearchV1Enabled(false);
        SearchBundle b = orchestrator.orchestrate("on", "latest news", "en", AiProfile.FAST);
        assertThat(b.status()).isEqualTo("unavailable");
        assertThat(b.detail()).isEqualTo("Search provider not configured");
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("FAST ON uses SearXNG and never Serper by default")
    void fastUsesSearxngNotSerper() {
        when(searxng.isConfigured()).thenReturn(true);
        when(searxng.search(anyString(), anyString(), anyInt())).thenReturn(new ProviderSearchOutcome(
                "SEARXNG", "q", true, "ok", "ok",
                List.of(new NormalizedSearchHit("T", "https://example.com", "S", "SEARXNG", "google", null, Instant.now(), null)),
                12L, null));

        SearchBundle b = orchestrator.orchestrate("on", "latest Java release", "en", AiProfile.FAST);
        assertThat(b.succeeded()).isTrue();
        assertThat(b.provider()).isEqualTo("SEARXNG");
        assertThat(b.toSearchInfo().getResults()).isNotEmpty();
        verify(searxng).search(anyString(), eq("en"), eq(properties.getMaxResultsFast()));
        verify(serper, never()).search(anyString(), anyInt());
    }

    @Test
    @DisplayName("SMART requests configured SMART result count")
    void smartUsesConfiguredResultCount() {
        when(searxng.isConfigured()).thenReturn(true);
        when(searxng.search(anyString(), anyString(), anyInt())).thenReturn(new ProviderSearchOutcome(
                "SEARXNG", "q", true, "ok", "ok",
                List.of(new NormalizedSearchHit("T", "https://example.com", "S", "SEARXNG", "google", null, Instant.now(), null)),
                12L, null));

        orchestrator.orchestrate("on", "latest news today", "ja", AiProfile.SMART);
        verify(searxng).search(anyString(), eq("ja"), eq(properties.getMaxResultsSmart()));
    }

    @Test
    @DisplayName("Local paid fallback stays off unless explicitly enabled")
    void noSilentPaidFallback() {
        when(searxng.isConfigured()).thenReturn(true);
        when(searxng.search(anyString(), anyString(), anyInt())).thenReturn(
                ProviderSearchOutcome.failed("SEARXNG", "q", "unavailable", "down"));

        SearchBundle b = orchestrator.orchestrate("on", "latest news", "en", AiProfile.SMART);
        assertThat(b.succeeded()).isFalse();
        verify(serper, never()).search(anyString(), anyInt());
    }

    @Test
    @DisplayName("CLOUD with Groq browser flag uses native tool path without Serper")
    void cloudNativeGroq() {
        properties.getGroqNative().setBrowserSearchEnabled(true);
        AiGatewayProperties gw = new AiGatewayProperties();
        gw.setGroqApiKey("test-key");
        gw.setGroqModelSmart("openai/gpt-oss-120b");
        nativeSupport = new CloudNativeSearchSupport(properties, gw);
        orchestrator = new SearchOrchestrator(properties, policy, searxng, serper, cache, nativeSupport);

        SearchBundle b = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.CLOUD);
        assertThat(b.useNativeCloudTool()).isTrue();
        assertThat(b.nativeCloudProvider()).isEqualTo("GROQ_BROWSER_SEARCH");
        assertThat(b.succeeded()).isFalse();
        assertThat(b.toSearchInfo().isPerformed()).isFalse();
        assertThat(b.status()).isEqualTo("native_tool_requested");
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("AUTO greeting skips search")
    void autoGreetingSkip() {
        SearchBundle b = orchestrator.orchestrate("auto", "hello", "en", AiProfile.FAST);
        assertThat(b.status()).isEqualTo("skipped");
        verifyNoInteractions(searxng, serper);
    }
}
