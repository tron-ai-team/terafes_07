package com.tronai.career.v1;

import com.tronai.career.service.provider.CareerMapJobProvider;
import com.tronai.career.service.provider.ExternalJobListing;
import com.tronai.career.service.provider.MynaviJobProvider;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Live external probes (not mocked). Results are recorded as PASS/BLOCKED evidence.
 * Tagged {@code live} so CI can exclude them; included in local Career V1 verification.
 */
@Tag("live")
class LiveJobProviderProbeTest {

    @Test
    void mynaviLiveProbe() throws Exception {
        MynaviJobProvider provider = new MynaviJobProvider();
        List<ExternalJobListing> jobs = provider.fetchJobs();
        Path evidence = Path.of("../../_career_center_v1_evidence").toAbsolutePath().normalize();
        Files.createDirectories(evidence);
        String report = "status=" + provider.lastFetchStatus() + "\ncount=" + jobs.size() + "\n"
                + jobs.stream().limit(5)
                .map(j -> j.getSourceUrl() + " | " + j.getTitle())
                .reduce("", (a, b) -> a + b + "\n");
        Files.writeString(evidence.resolve("live_mynavi_probe.txt"), report);
        // Live empty is allowed (JS/auth walls) — must not fabricate.
        assertThat(provider.lastFetchStatus()).isNotBlank();
        if (!jobs.isEmpty()) {
            assertThat(jobs.getFirst().getSourceUrl()).contains("mynavi");
        }
    }

    @Test
    void careermapLiveProbe() throws Exception {
        CareerMapJobProvider provider = new CareerMapJobProvider();
        List<ExternalJobListing> jobs = provider.fetchJobs();
        Path evidence = Path.of("../../_career_center_v1_evidence").toAbsolutePath().normalize();
        Files.createDirectories(evidence);
        String report = "status=" + provider.lastFetchStatus()
                + "\noauthEnabled=" + provider.isOauthEnabled()
                + "\ncount=" + jobs.size() + "\n"
                + jobs.stream().limit(5)
                .map(j -> j.getSourceUrl() + " | " + j.getTitle())
                .reduce("", (a, b) -> a + b + "\n");
        Files.writeString(evidence.resolve("live_careermap_probe.txt"), report);
        assertThat(provider.lastFetchStatus()).isNotBlank();
    }
}
