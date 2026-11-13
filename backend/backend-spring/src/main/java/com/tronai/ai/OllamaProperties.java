package com.tronai.ai;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "ollama")
public class OllamaProperties implements OllamaEndpointConfig {
    /**
     * Ollama base URL. For RTX Tailscale Serve use the HTTPS MagicDNS URL
     * (keeps TLS SNI + certificate identity correct).
     */
    private String baseUrl = "http://127.0.0.1:11434";
    private String model = "qwen3:8b";
    private int timeoutSeconds = 60;
    private int numCtx = 4096;

    /**
     * Optional Tailscale IP used to resolve {@link #tlsServerName} / base-url host
     * when MagicDNS is unavailable (common inside Docker bridge networks).
     * Example: {@code 100.95.30.39}
     */
    private String connectIp = "";

    /**
     * Hostname used for TLS SNI and certificate verification when {@link #connectIp} is set.
     * Defaults to the host component of {@link #baseUrl}.
     */
    private String tlsServerName = "";

    /**
     * Optional HTTP Host header override. Required for Tailscale Serve → Ollama
     * because Ollama expects {@code localhost:11434} and rejects the Serve hostname.
     */
    private String overrideHost = "";
}
