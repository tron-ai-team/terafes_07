package com.tronai.ai.gateway;

public enum GatewayProviderId {
    OLLAMA,
    /** Dedicated GTX Ollama server used exclusively for FAST when GTX Fast Mode is enabled. */
    OLLAMA_GTX,
    GROQ,
    OPENROUTER,
    MISTRAL,
    CLOUDFLARE_WORKERS_AI,
    GEMINI;

    public String wireName() {
        return name().toLowerCase();
    }

    /** Local / Tailscale Ollama endpoints (RTX or GTX) — not paid cloud providers. */
    public boolean isLocalOllama() {
        return this == OLLAMA || this == OLLAMA_GTX;
    }
}
