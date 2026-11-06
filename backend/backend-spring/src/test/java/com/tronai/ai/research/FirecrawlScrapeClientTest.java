package com.tronai.ai.research;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FirecrawlScrapeClientTest {

    @Test
    void disabledWhenNoApiKey() {
        ResearchProperties props = new ResearchProperties();
        FirecrawlScrapeClient client = new FirecrawlScrapeClient(props, new ObjectMapper());
        assertThat(client.isConfigured()).isFalse();
        assertThat(client.status()).isEqualTo(ResearchToolStatus.DISABLED);
        WebExtractResult result = client.scrape("https://example.com");
        assertThat(result.verified()).isFalse();
        assertThat(result.error()).contains("not configured");
    }
}
