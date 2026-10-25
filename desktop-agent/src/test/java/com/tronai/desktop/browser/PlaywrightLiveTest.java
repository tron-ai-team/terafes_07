package com.tronai.desktop.browser;

import com.sun.net.httpserver.HttpServer;
import com.tronai.desktop.protocol.ProtocolMessage;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class PlaywrightLiveTest {

    @Test
    void opensALocalPageAndReadsText() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/tron", exchange -> {
            byte[] body = "<html><head><title>TRON Browser</title></head><body><p id=\"msg\">TRON Desktop Agent works</p></body></html>"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "text/html; charset=utf-8");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        PlaywrightController browser = new PlaywrightController();
        try {
            int port = server.getAddress().getPort();
            ProtocolMessage.Arguments open = new ProtocolMessage.Arguments();
            open.setUrl("http://127.0.0.1:" + port + "/tron");
            ProtocolMessage.Result opened = browser.execute("OPEN_URL", open);
            assertThat(opened.isSuccess()).as(opened.getSummary()).isTrue();
            assertThat(opened.getSummary()).contains("TRON Browser");

            ProtocolMessage.Arguments text = new ProtocolMessage.Arguments();
            text.setSelector("#msg");
            ProtocolMessage.Result read = browser.execute("GET_TEXT", text);
            assertThat(read.isSuccess()).as(read.getSummary()).isTrue();
            assertThat(read.getStdout()).contains("TRON Desktop Agent works");

            ProtocolMessage.Result shot = browser.execute("SCREENSHOT", new ProtocolMessage.Arguments());
            assertThat(shot.isSuccess()).as(shot.getSummary()).isTrue();
            assertThat(shot.getScreenshotBase64()).isNotBlank();
            assertThat(shot.getMimeType()).isEqualTo("image/png");
        } finally {
            browser.stop();
            server.stop(0);
        }
    }
}
