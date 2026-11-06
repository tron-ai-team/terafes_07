package com.tronai.ai.secrets;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Optional Infisical Cloud secret manager. Disabled by default so local development
 * never depends on Infisical being online.
 */
@Component
@ConfigurationProperties(prefix = "tron.secrets.infisical")
public class InfisicalProperties {

    /** Must be explicitly enabled after owner creates Infisical project credentials. */
    private boolean enabled = false;
    private String siteUrl = "https://app.infisical.com";
    private String clientId = "";
    private String clientSecret = "";
    private String projectId = "";
    /** Infisical environment slug: e.g. development, staging, production */
    private String environment = "development";
    private String secretPath = "/";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 15000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getSiteUrl() {
        return siteUrl;
    }

    public void setSiteUrl(String siteUrl) {
        this.siteUrl = siteUrl == null || siteUrl.isBlank() ? "https://app.infisical.com" : siteUrl;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId == null ? "" : clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret == null ? "" : clientSecret;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId == null ? "" : projectId;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment == null || environment.isBlank() ? "development" : environment;
    }

    public String getSecretPath() {
        return secretPath;
    }

    public void setSecretPath(String secretPath) {
        this.secretPath = secretPath == null || secretPath.isBlank() ? "/" : secretPath;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public boolean credentialsPresent() {
        return enabled
                && !clientId.isBlank()
                && !clientSecret.isBlank()
                && !projectId.isBlank();
    }
}
