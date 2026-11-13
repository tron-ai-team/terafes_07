package com.tronai.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Independent GTX Ollama connection settings (Tailscale Serve HTTPS).
 * Must not reuse {@link OllamaProperties} / RTX values.
 */
@Data
@Component
@ConfigurationProperties(prefix = "gtx.ollama")
public class GtxOllamaProperties implements OllamaEndpointConfig {
    /**
     * GTX Ollama base URL. Prefer Tailscale Serve MagicDNS HTTPS so TLS SNI
     * and certificate identity stay correct.
     */
    private String baseUrl = "http://127.0.0.1:11434";
    private String model = "qwen3:8b";
    private int timeoutSeconds = 60;
    private int numCtx = 4096;

    /** Optional Tailscale IP DNS pin when MagicDNS is unavailable inside Docker. */
    private String connectIp = "";

    /** Hostname for TLS SNI / certificate verification when {@link #connectIp} is set. */
    private String tlsServerName = "";

    /**
     * HTTP Host override for Tailscale Serve → localhost-bound Ollama
     * (typically {@code localhost:11434}).
     */
    private String overrideHost = "";
}
