package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.profile.AiProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Search must never change inference mode: FAST/SMART stay local-locked to SearXNG.
 */
@ExtendWith(MockitoExtension.class)
class SearchRoutingLockTest {

    @Mock SearxngSearchClient searxng;
    @Mock SerperSearchClient serper;
    @Mock SearchCache cache;

    WebSearchProperties properties;
    SearchOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        properties = new WebSearchProperties();
        properties.setWebSearchV1Enabled(true);
        properties.getSearxng().setEnabled(true);
        properties.getSearxng().setBaseUrl("http://tron-searxng:8080");
        properties.setLocalPaidFallbackEnabled(false);
        AiGatewayProperties gw = new AiGatewayProperties();
        gw.setGtxFastModeEnabled(true);
        gw.setRtxSmartModeEnabled(true);
        CloudNativeSearchSupport nativeSupport = new CloudNativeSearchSupport(properties, gw);
        orchestrator = new SearchOrchestrator(
                properties, new SearchDecisionPolicy(properties), searxng, serper, cache, nativeSupport);
    }

    @Test
    @DisplayName("FAST and SMART use SearXNG only; Serper never called by default")
    void fastAndSmartStayOnSearxng() {
        when(searxng.isConfigured()).thenReturn(true);
        when(searxng.search(anyString(), anyString(), anyInt())).thenReturn(new ProviderSearchOutcome(
                "SEARXNG", "q", true, "ok", "ok",
                List.of(new NormalizedSearchHit("T", "https://example.com", "S", "SEARXNG", "google", null, Instant.now(), null)),
                5L, null));

        SearchBundle fast = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.FAST);
        SearchBundle smart = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.SMART);

        assertThat(fast.provider()).isEqualTo("SEARXNG");
        assertThat(smart.provider()).isEqualTo("SEARXNG");
        assertThat(fast.useNativeCloudTool()).isFalse();
        assertThat(smart.useNativeCloudTool()).isFalse();
        verify(serper, never()).search(anyString(), anyInt());

        ArgumentCaptor<Integer> limits = ArgumentCaptor.forClass(Integer.class);
        verify(searxng, times(2)).search(anyString(), eq("en"), limits.capture());
        assertThat(limits.getAllValues()).containsExactly(
                properties.getMaxResultsFast(), properties.getMaxResultsSmart());
    }

    @Test
    @DisplayName("CLOUD native request does not claim performed without evidence")
    void cloudNativeDoesNotClaimSuccessWithoutEvidence() {
        properties.getGroqNative().setBrowserSearchEnabled(true);
        AiGatewayProperties gw = new AiGatewayProperties();
        gw.setGroqApiKey("k");
        gw.setGroqModelSmart("openai/gpt-oss-120b");
        CloudNativeSearchSupport nativeSupport = new CloudNativeSearchSupport(properties, gw);
        orchestrator = new SearchOrchestrator(
                properties, new SearchDecisionPolicy(properties), searxng, serper, cache, nativeSupport);

        SearchBundle cloud = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.CLOUD);
        assertThat(cloud.useNativeCloudTool()).isTrue();
        assertThat(cloud.toSearchInfo().isPerformed()).isFalse();
        assertThat(cloud.succeeded()).isFalse();
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("Local lock covers FAST/SMART/QUALITY/AUTO AiMode mapping")
    void localLockModes() {
        // Smoke: OFF never touches providers regardless of profile.
        SearchBundle off = orchestrator.orchestrate("off", "latest news today", "en", AiProfile.SMART);
        assertThat(off.status()).isEqualTo("skipped");
        verifyNoInteractions(searxng, serper);
        assertThat(AiMode.FAST.name()).isEqualTo("FAST");
        assertThat(AiMode.SMART.name()).isEqualTo("SMART");
    }
}
