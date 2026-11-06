package com.tronai.ai.research;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TavilySearchClientTest {

    @Test
    void disabledWhenNoApiKey() {
        ResearchProperties props = new ResearchProperties();
        TavilySearchClient client = new TavilySearchClient(props, new ObjectMapper());
        assertThat(client.isConfigured()).isFalse();
        assertThat(client.status()).isEqualTo(ResearchToolStatus.DISABLED);
        WebSearchResult result = client.search("Acme Corp", 3);
        assertThat(result.hits()).isEmpty();
        assertThat(result.error()).contains("not configured");
    }
}
