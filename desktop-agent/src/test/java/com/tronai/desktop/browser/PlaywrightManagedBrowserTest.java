package com.tronai.desktop.browser;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.tronai.desktop.protocol.ProtocolMessage;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PlaywrightManagedBrowserTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Test
    void headedSessionKeepsLoginAndRejectsAgentClicks() throws Exception {
        HttpServer site = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        site.createContext("/login", exchange -> html(exchange, """
                <html><head><title>TRON Login</title></head><body>
                <p>TRON Login Required</p>
                <form>
                <input id="email">
                <input id="password" type="password">
                <button id="enter" type="button">Sign in</button>
                </form>
                <script>
                document.getElementById('enter').onclick = () => {
                  const email = document.getElementById('email').value;
                  const password = document.getElementById('password').value;
                  if (email === 'tron' && password === 'tron-pass') location.href = '/account';
                };
                </script></body></html>
                """));
        site.createContext("/account", exchange -> html(exchange, """
                <html><head><title>TRON Account</title></head><body><p id="msg">TRON Logged In</p></body></html>
                """));
        site.start();
        Path profile = Path.of(System.getProperty("java.io.tmpdir"), "TRON", "browser-profile", "managed-" + System.nanoTime());
        Files.createDirectories(profile);
        PlaywrightController browser = new PlaywrightController();
        browser.setProfileDirectory(profile);
        try {
            int sitePort = site.getAddress().getPort();
            ProtocolMessage.Arguments open = new ProtocolMessage.Arguments();
            open.setUrl("http://127.0.0.1:" + sitePort + "/login");
            open.setHeaded(true);
            open.setPersistent(true);
            ProtocolMessage.Result opened = browser.execute("OPEN_URL", open);
            assertThat(opened.isSuccess()).as(opened.getSummary()).isTrue();
            assertThat(opened.getTitle()).contains("TRON Login");

            ProtocolMessage.Arguments user = new ProtocolMessage.Arguments();
            user.setBrowserControl("USER");
            ProtocolMessage.Result handed = browser.execute("SET_CONTROL", user);
            assertThat(handed.isSuccess()).as(handed.getSummary()).isTrue();
            assertThat(browser.userControlled()).isTrue();

            ProtocolMessage.Arguments click = new ProtocolMessage.Arguments();
            click.setSelector("#enter");
            ProtocolMessage.Result blocked = browser.execute("CLICK", click);
            assertThat(blocked.isSuccess()).isFalse();
            assertThat(blocked.getSummary()).contains("user control");

            HttpResponse<String> direct = post(browser.helperPort(), "/click", Map.of("selector", "#enter"));
            assertThat(direct.statusCode()).isEqualTo(409);

            assertThat(post(browser.helperPort(), "/human/type", Map.of("selector", "#email", "text", "tron")).statusCode()).isEqualTo(200);
            assertThat(post(browser.helperPort(), "/human/type", Map.of("selector", "#password", "text", "tron-pass")).statusCode()).isEqualTo(200);
            assertThat(post(browser.helperPort(), "/human/click", Map.of("selector", "#enter")).statusCode()).isEqualTo(200);

            ProtocolMessage.Arguments agent = new ProtocolMessage.Arguments();
            agent.setBrowserControl("AGENT");
            assertThat(browser.execute("SET_CONTROL", agent).isSuccess()).isTrue();
            ProtocolMessage.Arguments read = new ProtocolMessage.Arguments();
            read.setSelector("body");
            ProtocolMessage.Result text = browser.execute("GET_TEXT", read);
            assertThat(text.getStdout()).contains("TRON Logged In");

            ProtocolMessage.Result shot = browser.execute("SCREENSHOT", new ProtocolMessage.Arguments());
            assertThat(shot.isSuccess()).as(shot.getSummary()).isTrue();
            assertThat(shot.getScreenshotBase64()).startsWith("iVBORw0KGgo");
            assertThat(shot.getSummary()).isEqualTo("Screenshot captured");

            int port = browser.helperPort();
            browser.stop();
            HttpResponse<String> closed;
            try {
                closed = post(port, "/inspect", Map.of());
            } catch (Exception e) {
                closed = null;
            }
            assertThat(closed).isNull();
        } finally {
            browser.stop();
            site.stop(0);
        }
    }

    private HttpResponse<String> post(int port, String path, Map<String, Object> body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private static void html(HttpExchange exchange, String html) throws java.io.IOException {
        byte[] body = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "text/html; charset=utf-8");
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }
}
