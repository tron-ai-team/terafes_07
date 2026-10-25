package com.tronai.desktop.browser;

import com.tronai.desktop.protocol.ProtocolMessage;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class PlaywrightPublicSiteLiveTest {

    @Test
    void opensExampleDotComCapturesScreenshot() throws Exception {
        PlaywrightController browser = new PlaywrightController();
        try {
            ProtocolMessage.Arguments open = new ProtocolMessage.Arguments();
            open.setUrl("https://example.com/");
            ProtocolMessage.Result opened = browser.execute("OPEN_URL", open);
            assertThat(opened.isSuccess()).as(opened.getSummary()).isTrue();
            assertThat(opened.getSummary()).containsIgnoringCase("Example");

            ProtocolMessage.Result inspect = browser.execute("INSPECT", new ProtocolMessage.Arguments());
            assertThat(inspect.isSuccess()).as(inspect.getSummary()).isTrue();

            ProtocolMessage.Result shot = browser.execute("SCREENSHOT", new ProtocolMessage.Arguments());
            assertThat(shot.isSuccess()).as(shot.getSummary()).isTrue();
            assertThat(shot.getScreenshotBase64()).isNotBlank();

            Path evidence = Path.of("c:/Users/engrm/OneDrive/Desktop/Group7/_v4b_evidence");
            Files.createDirectories(evidence);
            Files.write(evidence.resolve("example-com-screenshot.png"),
                    Base64.getDecoder().decode(shot.getScreenshotBase64()));
            Files.writeString(evidence.resolve("example-com-inspect.txt"),
                    "openSummary=" + opened.getSummary()
                            + "\ninspectSummary=" + inspect.getSummary()
                            + "\ninspectStdout=" + inspect.getStdout()
                            + "\nurlHint=https://example.com/");
        } finally {
            browser.stop();
        }
    }
}