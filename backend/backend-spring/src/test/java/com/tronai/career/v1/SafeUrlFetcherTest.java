package com.tronai.career.v1;

import com.tronai.career.company.SafeUrlFetcher;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SafeUrlFetcherTest {

    @Test
    void blocksLocalhost() {
        SafeUrlFetcher fetcher = new SafeUrlFetcher();
        assertThatThrownBy(() -> fetcher.validate("http://localhost/page"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void allowsPublicHttps() {
        SafeUrlFetcher fetcher = new SafeUrlFetcher();
        assertThatCode(() -> fetcher.validate("https://example.com/about"))
                .doesNotThrowAnyException();
    }
}
