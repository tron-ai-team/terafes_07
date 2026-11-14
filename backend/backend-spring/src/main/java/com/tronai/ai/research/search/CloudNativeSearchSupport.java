package com.tronai.ai.research.search;

import com.tronai.ai.gateway.AiMode;
import com.tronai.ai.gateway.AiGatewayProperties;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

/**
 * Capability matrix for provider-native web search tools.
 * Groq browser_search is Exa-backed and model-specific — not Google.
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
        if (modelId == null || modelId.isBlank()) {
            modelId = gatewayProperties.getGroqModelSmart();
        }
        return GROQ_BROWSER_MODELS.contains(modelId.trim().toLowerCase(Locale.ROOT))
                || GROQ_BROWSER_MODELS.contains(modelId.trim());
    }

    public boolean openRouterWebSearchAllowed() {
        return properties.getOpenRouterNative().isWebSearchToolEnabled();
    }

    public String preferredNativeProvider(AiMode mode) {
        // Prefer Groq when configured for cloud/smart paths; OpenRouter otherwise when enabled.
        if (properties.getGroqNative().isBrowserSearchEnabled()
                && groqBrowserSearchAllowed(gatewayProperties.getGroqModelSmart())) {
            return "GROQ_BROWSER_SEARCH";
        }
        if (openRouterWebSearchAllowed()) {
            return "OPENROUTER_WEB_SEARCH";
        }
        return "";
    }

    public static boolean isGroqBrowserCompatibleModel(String modelId) {
        if (modelId == null) {
            return false;
        }
        String m = modelId.trim();
        return GROQ_BROWSER_MODELS.contains(m) || GROQ_BROWSER_MODELS.contains(m.toLowerCase(Locale.ROOT));
    }
}
