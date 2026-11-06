package com.tronai.ai.secrets;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Pulls secrets from Infisical Universal Auth when explicitly enabled.
 * Never logs secret values. Returns empty map when disabled or incomplete.
 */
@Component
public class InfisicalSecretsLoader {

    private static final Logger log = LoggerFactory.getLogger(InfisicalSecretsLoader.class);

    private final InfisicalProperties properties;
    private final ObjectMapper objectMapper;

    public InfisicalSecretsLoader(InfisicalProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public Map<String, String> load() {
        if (!properties.isEnabled()) {
            return Map.of();
        }
        if (!properties.credentialsPresent()) {
            log.warn("Infisical enabled but credentials incomplete — skipping remote secrets");
            return Map.of();
        }
        try {
            String token = login();
            if (token == null || token.isBlank()) {
                log.warn("Infisical login failed — skipping remote secrets");
                return Map.of();
            }
            Map<String, String> secrets = fetchSecrets(token);
            log.info("Loaded {} secret keys from Infisical env={}", secrets.size(), properties.getEnvironment());
            return secrets;
        } catch (Exception e) {
            log.warn("Infisical unavailable ({}) — continuing with env/local secrets only",
                    e.getClass().getSimpleName());
            return Map.of();
        }
    }

    public Map<String, Object> publicStatus() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", properties.isEnabled());
        m.put("credentialsPresent", properties.credentialsPresent());
        m.put("environment", properties.getEnvironment());
        m.put("projectConfigured", properties.getProjectId() != null && !properties.getProjectId().isBlank());
        return m;
    }

    private String login() {
        Map<String, String> body = Map.of(
                "clientId", properties.getClientId().trim(),
                "clientSecret", properties.getClientSecret().trim());
        String raw = restClient().post()
                .uri("/api/v1/auth/universal-auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
        JsonNode root = read(raw);
        JsonNode token = root.path("accessToken");
        if (token.isMissingNode() || token.asText("").isBlank()) {
            token = root.path("token");
        }
        return token.asText(null);
    }

    private Map<String, String> fetchSecrets(String accessToken) throws Exception {
        String raw = restClient().get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/v3/secrets/raw")
                        .queryParam("workspaceId", properties.getProjectId().trim())
                        .queryParam("environment", properties.getEnvironment().trim())
                        .queryParam("secretPath", properties.getSecretPath())
                        .queryParam("include_imports", "true")
                        .build())
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(String.class);

        Map<String, String> out = new LinkedHashMap<>();
        JsonNode root = objectMapper.readTree(raw == null ? "{}" : raw);
        JsonNode secrets = root.path("secrets");
        if (!secrets.isArray()) {
            return out;
        }
        for (JsonNode node : secrets) {
            String key = node.path("secretKey").asText("");
            if (key.isBlank()) {
                key = node.path("key").asText("");
            }
            String value = node.path("secretValue").asText("");
            if (value.isBlank()) {
                value = node.path("value").asText("");
            }
            if (!key.isBlank() && !value.isBlank()) {
                out.put(key, value);
            }
        }
        return out;
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        String base = properties.getSiteUrl().replaceAll("/+$", "");
        return RestClient.builder().baseUrl(base).requestFactory(factory).build();
    }

    private JsonNode read(String raw) {
        try {
            return objectMapper.readTree(raw == null ? "{}" : raw);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }
}
