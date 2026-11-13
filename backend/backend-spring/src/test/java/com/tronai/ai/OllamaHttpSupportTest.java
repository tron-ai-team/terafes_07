package com.tronai.ai;

import org.apache.hc.client5.http.DnsResolver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;

class OllamaHttpSupportTest {

    @Test
    @DisplayName("DNS pin resolves MagicDNS host to configured Tailscale IP with hostname retained")
    void dnsPinRetainsHostname() throws Exception {
        OllamaProperties props = new OllamaProperties();
        props.setBaseUrl("https://rtx.example.ts.net");
        props.setConnectIp("100.95.30.39");
        props.setTlsServerName("rtx.example.ts.net");

        DnsResolver resolver = OllamaHttpSupport.createDnsResolver(props);
        assertThat(resolver).isNotNull();

        InetAddress[] resolved = resolver.resolve("rtx.example.ts.net");
        assertThat(resolved).hasSize(1);
        assertThat(resolved[0].getHostName()).isEqualTo("rtx.example.ts.net");
        assertThat(resolved[0].getHostAddress()).isEqualTo("100.95.30.39");
    }

    @Test
    @DisplayName("DNS pin is inactive when connect-ip is blank")
    void dnsPinDisabledWithoutConnectIp() {
        OllamaProperties props = new OllamaProperties();
        props.setBaseUrl("https://rtx.example.ts.net");
        props.setConnectIp("");
        assertThat(OllamaHttpSupport.createDnsResolver(props)).isNull();
    }

    @Test
    @DisplayName("Pinned host defaults to base-url host")
    void pinnedHostFromBaseUrl() {
        OllamaProperties props = new OllamaProperties();
        props.setBaseUrl("https://nayem-asus-tuf-gaming-a15-fa507nvr-fa507nvr.tail63f4de.ts.net/");
        assertThat(OllamaHttpSupport.resolvePinnedHost(props))
                .isEqualTo("nayem-asus-tuf-gaming-a15-fa507nvr-fa507nvr.tail63f4de.ts.net");
    }
}
