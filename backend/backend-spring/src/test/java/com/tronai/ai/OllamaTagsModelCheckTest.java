package com.tronai.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OllamaTagsModelCheckTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("tagsListContainsModel matches exact installed model name")
    void matchesExactName() {
        String json = """
                {"models":[{"name":"qwen3:8b","model":"qwen3:8b","size":1}]}
                """;
        assertThat(OllamaClient.tagsListContainsModel(json, "qwen3:8b", mapper)).isTrue();
        assertThat(OllamaClient.tagsListContainsModel(json, "qwen3.5:9b-q4_K_M", mapper)).isFalse();
    }

    @Test
    @DisplayName("tagsListContainsModel matches name@digest forms")
    void matchesDigestSuffix() {
        String json = """
                {"models":[{"name":"qwen3:8b@sha256:abc","model":"qwen3:8b"}]}
                """;
        assertThat(OllamaClient.tagsListContainsModel(json, "qwen3:8b", mapper)).isTrue();
    }

    @Test
    @DisplayName("tagsListContainsModel fails closed on empty or malformed payloads")
    void failsClosed() {
        assertThat(OllamaClient.tagsListContainsModel("", "qwen3:8b", mapper)).isFalse();
        assertThat(OllamaClient.tagsListContainsModel("{}", "qwen3:8b", mapper)).isFalse();
        assertThat(OllamaClient.tagsListContainsModel("{\"models\":[]}", "qwen3:8b", mapper)).isFalse();
        assertThat(OllamaClient.tagsListContainsModel("not-json", "qwen3:8b", mapper)).isFalse();
    }
}
