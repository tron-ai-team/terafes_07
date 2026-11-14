package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiGatewayProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Capability matrix for provider-native web search tools.
 * Groq browser_search is Exa-backed and model-specific — not Google.
 * Preferring a native tool must not be reported as a completed web search.
 */
@Component
public class CloudNativeSearchSupport {

    private static final Set<String> GROQ_BROWSER_MODELS = Set.of(
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b"
    );

    private final WebSearchProperties properties;
    private final AiGatewayProperties gatewayProperties;

    public CloudNativeSearchSupport(WebSearchProperties properties, AiGatewayProperties gatewayProperties) {
        this.properties = properties;
        this.gatewayProperties = gatewayProperties;
    }

    public boolean isCloudLike(AiMode mode) {
        if (mode == null) {
            return false;
        }
        return mode == AiMode.CLOUD || mode == AiMode.ULTRA
                || (!gatewayProperties.isGtxFastModeEnabled() && !gatewayProperties.isRtxSmartModeEnabled()
                && (mode == AiMode.SMART || mode == AiMode.QUALITY));
    }

    public boolean groqBrowserSearchAllowed(String modelId) {
        if (!properties.getGroqNative().isBrowserSearchEnabled()) {
            return false;
        }
        if (!hasText(gatewayProperties.getGroqApiKey())) {
            return false;
        }
        if (modelId == null || modelId.isBlank()) {
            modelId = gatewayProperties.getGroqModelSmart();
        }
        return isGroqBrowserCompatibleModel(modelId);
    }

    public boolean openRouterWebSearchAllowed() {
        if (!properties.getOpenRouterNative().isWebSearchToolEnabled()) {
            return false;
        }
        return hasText(gatewayProperties.getOpenrouterApiKey1())
                || hasText(gatewayProperties.getOpenrouterApiKey2());
    }

    /**
     * Returns the native tool provider that may be requested for this mode,
     * or empty when the configured inference chain cannot honestly support it.
     */
    public String preferredNativeProvider(AiMode mode) {
        // Match AiModelRouter CLOUD preference: Groq first when preferGroqForSmart.
        boolean preferGroq = gatewayProperties.isPreferGroqForSmart();
        if (preferGroq) {
            if (groqBrowserSearchAllowed(gatewayProperties.getGroqModelSmart())) {
                return "GROQ_BROWSER_SEARCH";
            }
            if (openRouterWebSearchAllowed()) {
                return "OPENROUTER_WEB_SEARCH";
            }
        } else {
            if (openRouterWebSearchAllowed()) {
                return "OPENROUTER_WEB_SEARCH";
            }
            if (groqBrowserSearchAllowed(gatewayProperties.getGroqModelSmart())) {
                return "GROQ_BROWSER_SEARCH";
            }
        }
        return "";
    }

    /**
     * After inference, only treat native search as performed when usable citations exist.
     */
    public SearchBundle finalizeNativeBundle(SearchBundle requested, List<NormalizedSearchHit> verifiedHits) {
        if (requested == null || !requested.useNativeCloudTool()) {
            return requested;
        }
        List<String> warnings = new ArrayList<>(requested.warnings());
        if (verifiedHits != null && !verifiedHits.isEmpty()) {
            List<NormalizedSearchHit> sanitized = SearchResultSanitizer.sanitize(
                    verifiedHits,
                    Math.max(1, properties.getMaxResultsCloud()),
                    properties.getMaxSnippetChars(),
                    warnings);
            if (!sanitized.isEmpty()) {
                return new SearchBundle(
                        true,
                        true,
                        true,
                        requested.mode(),
                        requested.nativeCloudProvider(),
                        requested.fallbackReason(),
                        requested.query(),
                        "ok",
                        "Provider returned usable web evidence via " + requested.nativeCloudProvider(),
                        sanitized,
                        warnings,
                        requested.timingMs(),
                        true,
                        requested.nativeCloudProvider());
            }
        }
        if (!warnings.contains("Native provider did not expose usable search evidence")) {
            warnings.add("Native provider did not expose usable search evidence");
        }
        return new SearchBundle(
                true,
                true,
                false,
                requested.mode(),
                requested.nativeCloudProvider(),
                requested.fallbackReason(),
                requested.query(),
                "native_tool_unverified",
                "Native web search tool was requested but the provider response did not include "
                        + "verifiable citations or source URLs. No sources invented.",
                List.of(),
                warnings,
                requested.timingMs(),
                true,
                requested.nativeCloudProvider());
    }

    public static boolean isGroqBrowserCompatibleModel(String modelId) {
        if (modelId == null) {
            return false;
        }
        String m = modelId.trim();
        return GROQ_BROWSER_MODELS.contains(m) || GROQ_BROWSER_MODELS.contains(m.toLowerCase(Locale.ROOT));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
