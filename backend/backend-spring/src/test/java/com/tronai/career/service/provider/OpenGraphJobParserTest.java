package com.tronai.career.service.provider;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OpenGraphJobParserTest {

    @Test
    void parsesCareerMapOgTitleCompanyAndRole() {
        String html = """
                <html><head>
                <meta property="og:title" content="株式会社テストのシステムエンジニア 求人 | キャリアマップ">
                <meta property="og:description" content="東京都渋谷区 業務システム開発 Java">
                </head><body></body></html>
                """;
        ExternalJobListing listing = OpenGraphJobParser.parseCareerMapJob(
                "https://www.careermap.jp/jobs/343792", html, Instant.parse("2026-11-07T00:00:00Z"));
        assertThat(listing).isNotNull();
        assertThat(listing.getCompany()).isEqualTo("株式会社テスト");
        assertThat(listing.getTitle()).contains("システムエンジニア");
        assertThat(listing.getLocation()).isEqualTo("東京都");
        assertThat(listing.getSourceUrl()).isEqualTo("https://www.careermap.jp/jobs/343792");
        assertThat(listing.getApplicationStatus()).isEqualTo("UNKNOWN");
        assertThat(listing.getInternationalStudentPolicy()).isEqualTo("UNKNOWN");
        assertThat(listing.getTags()).contains("システムエンジニア");
    }

    @Test
    void extractsJobUrlsFromSitemap() {
        String xml = """
                <urlset>
                  <url><loc>https://www.careermap.jp/jobs/111</loc></url>
                  <url><loc>https://www.careermap.jp/corporations/9</loc></url>
                  <url><loc>https://www.careermap.jp/jobs/222</loc></url>
                </urlset>
                """;
        List<String> urls = OpenGraphJobParser.extractJobUrlsFromSitemap(xml);
        assertThat(urls).containsExactly(
                "https://www.careermap.jp/jobs/111",
                "https://www.careermap.jp/jobs/222");
    }

    @Test
    void doesNotFabricateWhenMetadataMissing() {
        ExternalJobListing listing = OpenGraphJobParser.parseCareerMapJob(
                "https://www.careermap.jp/jobs/1", "<html><head></head><body>empty</body></html>", Instant.now());
        assertThat(listing).isNull();
    }
}
