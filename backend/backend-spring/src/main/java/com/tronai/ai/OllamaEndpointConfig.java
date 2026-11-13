package com.tronai.ai;

/**
 * Shared Tailscale Serve / Ollama connection settings used by {@link OllamaHttpSupport}.
 * RTX and GTX each supply an independent implementation so connection config never crosses servers.
 */
public interface OllamaEndpointConfig {

    String getBaseUrl();

    int getTimeoutSeconds();

    int getNumCtx();

    String getConnectIp();

    String getTlsServerName();

    String getOverrideHost();
}
