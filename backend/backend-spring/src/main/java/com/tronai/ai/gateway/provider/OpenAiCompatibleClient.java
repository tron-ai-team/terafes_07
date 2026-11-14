package com.tronai.ai.gateway.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tronai.ai.ChatMessage;
import com.tronai.ai.gateway.AiGenerationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiCompatibleClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleClient.class);

    private final ObjectMapper objectMapper;

    public OpenAiCompatibleClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public AiGenerationResult generate(
            String baseUrl,
            String apiKey,
            String model,
            List<ChatMessage> messages,
            Double temperature,
            Integer maxTokens,
            boolean jsonMode,
            Map<String, String> extraHeaders,
            int timeoutSeconds) {
        return generate(baseUrl, apiKey, model, messages, temperature, maxTokens, jsonMode,
                extraHeaders, timeoutSeconds, null);
    }

    public AiGenerationResult generate(
            String baseUrl,
            String apiKey,
            String model,
            List<ChatMessage> messages,
            Double temperature,
            Integer maxTokens,
            boolean jsonMode,
            Map<String, String> extraHeaders,
            int timeoutSeconds,
            List<Map<String, Object>> tools) {

        long start = System.currentTimeMillis();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(Math.min(10, timeoutSeconds)));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        RestClient client = RestClient.builder()
                .baseUrl(trimTrailingSlash(baseUrl))
                .requestFactory(factory)
                .build();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", toOpenAiMessages(messages));
        if (temperature != null) {
            body.put("temperature", temperature);
        }
        if (maxTokens != null && maxTokens > 0) {
            body.put("max_tokens", maxTokens);
        }
        // Structured JSON mode is incompatible with some tool-calling paths — skip when tools present.
        if (jsonMode && (tools == null || tools.isEmpty())) {
            body.put("response_format", Map.of("type", "json_object"));
        }
        if (tools != null && !tools.isEmpty()) {
            body.put("tools", tools);
        }

        try {
            String raw = client.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> {
                        h.setBearerAuth(apiKey);
                        if (extraHeaders != null) {
                            extraHeaders.forEach(h::set);
                        }
                    })
                    .body(body)
                    .retrieve()
                    .body(String.class);

            long latency = System.currentTimeMillis() - start;
            return parseCompletion(raw, latency);
        } catch (RestClientResponseException e) {
            throw mapHttpError(e);
        } catch (ResourceAccessException e) {
            if (e.getCause() instanceof SocketTimeoutException) {
                throw new GatewayProviderException(
                        GatewayProviderException.TIMEOUT, 408, "Provider request timed out", e);
            }
            throw new GatewayProviderException(
                    GatewayProviderException.UNAVAILABLE, 503, "Provider unreachable", e);
        } catch (GatewayProviderException e) {
            throw e;
        } catch (Exception e) {
            log.warn("OpenAI-compatible request failed: {}", e.getMessage());
            throw new GatewayProviderException(
                    GatewayProviderException.UPSTREAM_ERROR, 502, "Provider request failed", e);
        }
    }

    @SuppressWarnings("unchecked")
    private AiGenerationResult parseCompletion(String raw, long latencyMs) throws Exception {
        if (raw == null || raw.isBlank()) {
            throw new GatewayProviderException(GatewayProviderException.UPSTREAM_ERROR, 502, "Empty provider response");
        }
        Map<String, Object> root = objectMapper.readValue(raw, Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) root.get("choices");
        String text = "";
        String finishReason = "stop";
        List<AiGenerationResult.Citation> citations = new ArrayList<>();
        if (choices != null && !choices.isEmpty()) {
            Map<String, Object> choice = choices.get(0);
            if (choice.get("finish_reason") != null) {
                finishReason = choice.get("finish_reason").toString();
            }
            Map<String, Object> message = (Map<String, Object>) choice.get("message");
            if (message != null) {
                if (message.get("content") != null) {
                    text = message.get("content").toString();
                }
                citations.addAll(extractCitations(message));
            }
        }
        // Some providers attach citations at the root (never invent if absent).
        citations.addAll(extractCitations(root));
        int promptTokens = 0;
        int completionTokens = 0;
        Map<String, Object> usage = (Map<String, Object>) root.get("usage");
        if (usage != null) {
            if (usage.get("prompt_tokens") instanceof Number n) {
                promptTokens = n.intValue();
            }
            if (usage.get("completion_tokens") instanceof Number n) {
                completionTokens = n.intValue();
            }
        }
        boolean truncated = "length".equalsIgnoreCase(finishReason);
        return AiGenerationResult.builder()
                .text(text)
                .finishReason(finishReason)
                .truncated(truncated)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .latencyMs(latencyMs)
                .citations(dedupeCitations(citations))
                .build();
    }

    @SuppressWarnings("unchecked")
    private static List<AiGenerationResult.Citation> extractCitations(Map<String, Object> node) {
        List<AiGenerationResult.Citation> out = new ArrayList<>();
        if (node == null) {
            return out;
        }
        Object annotations = node.get("annotations");
        if (annotations instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }
                String type = stringVal(map.get("type"));
                if ("url_citation".equalsIgnoreCase(type) || type.isBlank()) {
                    Object citationObj = map.get("url_citation");
                    if (citationObj instanceof Map<?, ?> citationMap) {
                        out.add(citationFromMap(citationMap));
                    } else {
                        out.add(citationFromMap(map));
                    }
                }
            }
        }
        Object citations = node.get("citations");
        if (citations instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof String url && !url.isBlank()) {
                    out.add(new AiGenerationResult.Citation("", url, ""));
                } else if (item instanceof Map<?, ?> map) {
                    out.add(citationFromMap(map));
                }
            }
        }
        return out;
    }

    private static AiGenerationResult.Citation citationFromMap(Map<?, ?> map) {
        String url = firstNonBlank(stringVal(map.get("url")), stringVal(map.get("link")));
        String title = firstNonBlank(stringVal(map.get("title")), stringVal(map.get("name")));
        String snippet = firstNonBlank(stringVal(map.get("snippet")), stringVal(map.get("content")),
                stringVal(map.get("text")));
        return new AiGenerationResult.Citation(title, url, snippet);
    }

    private static List<AiGenerationResult.Citation> dedupeCitations(List<AiGenerationResult.Citation> in) {
        List<AiGenerationResult.Citation> out = new ArrayList<>();
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (AiGenerationResult.Citation c : in) {
            if (c == null || c.url() == null || c.url().isBlank()) {
                continue;
            }
            String key = c.url().trim().toLowerCase(java.util.Locale.ROOT);
            if (seen.add(key)) {
                out.add(c);
            }
        }
        return out;
    }

    private static String stringVal(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return "";
    }

    private GatewayProviderException mapHttpError(RestClientResponseException e) {
        int status = e.getStatusCode().value();
        String snippet = safeBodySnippet(e.getResponseBodyAsString());
        if (status == 401 || status == 403) {
            return new GatewayProviderException(
                    GatewayProviderException.INVALID_CREDENTIAL, status, "Invalid provider credentials: " + snippet);
        }
        if (status == 429) {
            return new GatewayProviderException(
                    GatewayProviderException.RATE_LIMITED, status, "Provider rate limited: " + snippet);
        }
        if (status == 402) {
            return new GatewayProviderException(
                    GatewayProviderException.PAYMENT_REQUIRED, status, "Provider payment required: " + snippet);
        }
        if (status == 400) {
            return new GatewayProviderException(
                    GatewayProviderException.BAD_REQUEST, status, "Invalid provider request: " + snippet);
        }
        if (e.getStatusCode().is5xxServerError()) {
            return new GatewayProviderException(
                    GatewayProviderException.UNAVAILABLE, status, "Provider unavailable: " + snippet);
        }
        return new GatewayProviderException(
                GatewayProviderException.UPSTREAM_ERROR, status, "Provider HTTP error: " + snippet);
    }

    private static String safeBodySnippet(String body) {
        if (body == null || body.isBlank()) {
            return "no body";
        }
        String trimmed = body.replaceAll("\\s+", " ").trim();
        return trimmed.length() > 200 ? trimmed.substring(0, 200) + "…" : trimmed;
    }

    private static List<Map<String, String>> toOpenAiMessages(List<ChatMessage> messages) {
        List<Map<String, String>> out = new ArrayList<>();
        if (messages == null) {
            return out;
        }
        for (ChatMessage m : messages) {
            if (m == null) {
                continue;
            }
            String role = m.getRole() != null ? m.getRole() : "user";
            String content = m.getContent() != null ? m.getContent() : "";
            out.add(Map.of("role", role, "content", content));
        }
        return out;
    }

    private static String trimTrailingSlash(String baseUrl) {
        if (baseUrl == null) {
            return "";
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }
}
