package com.tronai.ai.gateway.credential;

import com.tronai.ai.gateway.AiGatewayProperties;
import com.tronai.ai.research.ResearchProperties;
import com.tronai.ai.secrets.InfisicalSecretsLoader;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Merges secrets from Infisical (optional) and local secrets file into gateway/research properties.
 * Process environment / Spring-bound values always win over blank merges (merge-if-blank).
 * Never logs secret values.
 */
@Component
public class AiGatewaySecretsBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AiGatewaySecretsBootstrap.class);

    private final AiGatewayProperties properties;
    private final ResearchProperties researchProperties;
    private final InfisicalSecretsLoader infisicalSecretsLoader;

    public AiGatewaySecretsBootstrap(
            AiGatewayProperties properties,
            ResearchProperties researchProperties,
            InfisicalSecretsLoader infisicalSecretsLoader) {
        this.properties = properties;
        this.researchProperties = researchProperties;
        this.infisicalSecretsLoader = infisicalSecretsLoader;
    }

    @PostConstruct
    void mergeLocalSecrets() {
        Map<String, String> secrets = new LinkedHashMap<>();
        secrets.putAll(infisicalSecretsLoader.load());
        secrets.putAll(LocalSecretsLoader.load(LocalSecretsLoader.defaultPath()));
        if (secrets.isEmpty()) {
            log.info("No optional Infisical/local AI secrets file loaded (env vars still apply)");
            return;
        }

        mergeIfBlank(secrets, "GROQ_API_KEY", properties::getGroqApiKey, properties::setGroqApiKey);
        mergeIfBlank(secrets, "OPENROUTER_API_KEY_1", properties::getOpenrouterApiKey1, properties::setOpenrouterApiKey1);
        mergeIfBlank(secrets, "OPENROUTER_API_KEY_2", properties::getOpenrouterApiKey2, properties::setOpenrouterApiKey2);
        mergeIfBlank(secrets, "MISTRAL_API_KEY", properties::getMistralApiKey, properties::setMistralApiKey);
        mergeIfBlank(secrets, "CLOUDFLARE_API_TOKEN", properties::getCloudflareApiToken, properties::setCloudflareApiToken);
        mergeIfBlank(secrets, "CLOUDFLARE_ACCOUNT_ID", properties::getCloudflareAccountId, properties::setCloudflareAccountId);
        mergeIfBlank(secrets, "GEMINI_API_KEY_1", properties::getGeminiApiKey1, properties::setGeminiApiKey1);
        mergeIfBlank(secrets, "GEMINI_API_KEY_2", properties::getGeminiApiKey2, properties::setGeminiApiKey2);
        mergeIfBlank(secrets, "GEMINI_API_KEY_3", properties::getGeminiApiKey3, properties::setGeminiApiKey3);
        mergeIfBlank(secrets, "GEMINI_API_KEY_4", properties::getGeminiApiKey4, properties::setGeminiApiKey4);

        mergeIfBlank(secrets, "TAVILY_API_KEY",
                () -> researchProperties.getTavily().getApiKey(),
                v -> researchProperties.getTavily().setApiKey(v));
        mergeIfBlank(secrets, "FIRECRAWL_API_KEY",
                () -> researchProperties.getFirecrawl().getApiKey(),
                v -> researchProperties.getFirecrawl().setApiKey(v));

        log.info("Merged optional AI/research secret keys into configuration (values not logged)");
    }

    private void mergeIfBlank(
            Map<String, String> secrets,
            String key,
            java.util.function.Supplier<String> getter,
            java.util.function.Consumer<String> setter) {
        String current = getter.get();
        if (current != null && !current.isBlank()) {
            return;
        }
        String value = secrets.get(key);
        if (value != null && !value.isBlank()) {
            setter.accept(value.trim());
        }
    }
}
