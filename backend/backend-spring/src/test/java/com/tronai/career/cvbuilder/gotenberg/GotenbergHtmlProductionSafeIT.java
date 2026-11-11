package com.tronai.career.cvbuilder.gotenberg;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Live IT: interview report HTML→PDF via LibreOffice-first production-safe path.
 * Skips when local Gotenberg is not reachable (CI without Docker).
 */
class GotenbergHtmlProductionSafeIT {

    @Test
    @DisplayName("LibreOffice-first HTML convert produces valid PDF with Japanese text")
    void productionSafeHtmlConvert() {
        GotenbergProperties props = new GotenbergProperties();
        GotenbergPdfClient client = new GotenbergPdfClient(props);
        Assumptions.assumeTrue(client.isAvailable(), "Gotenberg not available on localhost:3000");

        String html = """
                <!DOCTYPE html>
                <html lang="ja"><head><meta charset="UTF-8"/><title>面接レポート</title></head>
                <body>
                  <h1>面接パフォーマンスレポート</h1>
                  <p>候補者の回答: Java と Spring Boot の実務経験があります。</p>
                  <p>English section: Follow-up on system design trade-offs.</p>
                  <div style="page-break-before: always"><h2>Page 2</h2><p>二ページ目の日本語</p></div>
                </body></html>
                """;

        byte[] pdf = client.convertHtmlProductionSafe(html.getBytes(StandardCharsets.UTF_8));
        assertThat(pdf).isNotNull();
        assertThat(pdf.length).isGreaterThan(500);
        assertThat(pdf[0]).isEqualTo((byte) '%');
        assertThat(pdf[1]).isEqualTo((byte) 'P');
        assertThat(pdf[2]).isEqualTo((byte) 'D');
        assertThat(pdf[3]).isEqualTo((byte) 'F');
    }
}
