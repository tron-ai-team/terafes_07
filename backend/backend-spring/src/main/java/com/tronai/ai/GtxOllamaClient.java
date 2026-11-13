package com.tronai.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/**
 * Dedicated GTX Ollama HTTP client with independent Tailscale Serve connection config.
 * Does not share {@link OllamaProperties} / RTX endpoint settings.
 */
@Component
public class GtxOllamaClient {

    private final OllamaClient delegate;

    public GtxOllamaClient(GtxOllamaProperties properties, ObjectMapper objectMapper) {
        this.delegate = new OllamaClient(properties, properties.getModel(), "GTX Ollama", objectMapper);
    }

    public boolean checkHealth() {
        return delegate.checkHealth();
    }

    public ChatGenerationResult chat(ChatGenerationRequest request) {
        return delegate.chat(request);
    }
}
