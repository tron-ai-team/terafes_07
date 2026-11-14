package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.gateway.AiGenerationResult;
import com.tronai.ai.profile.AiProfile;
import com.tronai.chat.dto.SearchInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class CloudNativeSearchHonestyTest {

    @Mock SearxngSearchClient searxng;
    @Mock SerperSearchClient serper;
    @Mock SearchCache cache;

    WebSearchProperties properties;
    SearchOrchestrator orchestrator;
    CloudNativeSearchSupport nativeSupport;

    @BeforeEach
    void setUp() {
        properties = new WebSearchProperties();
        properties.setWebSearchV1Enabled(true);
        properties.getGroqNative().setBrowserSearchEnabled(true);
        AiGatewayProperties gw = new AiGatewayProperties();
        gw.setGroqApiKey("test-groq-key");
        gw.setGroqModelSmart("openai/gpt-oss-120b");
        nativeSupport = new CloudNativeSearchSupport(properties, gw);
        orchestrator = new SearchOrchestrator(
                properties, new SearchDecisionPolicy(properties), searxng, serper, cache, nativeSupport);
    }

    @Test
    @DisplayName("Native tool request does not set performed=true without citations")
    void nativeRequestNotPerformed() {
        SearchBundle b = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.CLOUD);
        assertThat(b.useNativeCloudTool()).isTrue();
        assertThat(b.succeeded()).isFalse();
        assertThat(b.status()).isEqualTo("native_tool_requested");
        SearchInfo info = b.toSearchInfo();
        assertThat(info.isPerformed()).isFalse();
        assertThat(info.getAvailable()).isFalse();
        assertThat(info.getResults()).isEmpty();
        verifyNoInteractions(searxng, serper);
    }

    @Test
    @DisplayName("Finalize with verified citations sets performed=true")
    void finalizeWithCitations() {
        SearchBundle requested = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.CLOUD);
        List<NormalizedSearchHit> hits = NativeSearchEvidenceExtractor.fromGeneration(
                AiGenerationResult.builder()
                        .citations(List.of(new AiGenerationResult.Citation("T", "https://example.com/a", "s")))
                        .build(),
                "GROQ_BROWSER_SEARCH");
        SearchBundle finalized = nativeSupport.finalizeNativeBundle(requested, hits);
        assertThat(finalized.succeeded()).isTrue();
        assertThat(finalized.toSearchInfo().isPerformed()).isTrue();
        assertThat(finalized.toSearchInfo().getResults()).isNotEmpty();
    }

    @Test
    @DisplayName("Finalize without citations reports honest limitation")
    void finalizeWithoutCitations() {
        SearchBundle requested = orchestrator.orchestrate("on", "latest news today", "en", AiProfile.CLOUD);
        SearchBundle finalized = nativeSupport.finalizeNativeBundle(requested, List.of());
        assertThat(finalized.succeeded()).isFalse();
        assertThat(finalized.status()).isEqualTo("native_tool_unverified");
        assertThat(finalized.toSearchInfo().isPerformed()).isFalse();
        assertThat(finalized.detail()).containsIgnoringCase("verifiable");
    }

    @Test
    @DisplayName("Groq native requires API key and compatible model")
    void groqRequiresKeyAndModel() {
        AiGatewayProperties gw = new AiGatewayProperties();
        gw.setGroqModelSmart("openai/gpt-oss-120b");
        // no API key
        CloudNativeSearchSupport noKey = new CloudNativeSearchSupport(properties, gw);
        assertThat(noKey.preferredNativeProvider(com.tronai.ai.gateway.AiMode.CLOUD)).isEmpty();

        gw.setGroqApiKey("k");
        gw.setGroqModelSmart("llama-3.3-70b-versatile");
        CloudNativeSearchSupport badModel = new CloudNativeSearchSupport(properties, gw);
        assertThat(badModel.preferredNativeProvider(com.tronai.ai.gateway.AiMode.CLOUD)).isEmpty();
    }
}
