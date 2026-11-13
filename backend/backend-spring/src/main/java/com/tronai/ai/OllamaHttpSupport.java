package com.tronai.ai;

import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.HttpClient;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.DefaultClientTlsStrategy;
import org.apache.hc.client5.http.ssl.TlsSocketStrategy;
import org.apache.hc.core5.http.HttpHeaders;
import org.apache.hc.core5.http.io.SocketConfig;
import org.apache.hc.core5.util.Timeout;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Builds RestClients for Ollama with optional Tailscale DNS pin and Host override.
 *
 * <p>Production RTX Serve needs:
 * <ul>
 *   <li>TLS SNI + certificate identity = MagicDNS hostname (keep hostname in base URL)</li>
 *   <li>DNS pin to Tailscale IP when MagicDNS is unavailable inside Docker</li>
 *   <li>HTTP {@code Host: localhost:11434} because Ollama rejects the Serve Host header</li>
 * </ul>
 * Certificate validation stays enabled (default JVM trust store / Tailscale certs).
 */
final class OllamaHttpSupport {

    private OllamaHttpSupport() {
    }

    static RestClient createRestClient(OllamaProperties properties, Duration connectTimeout, Duration readTimeout) {
        HttpClient httpClient = createHttpClient(properties, connectTimeout, readTimeout);
        // Timeouts are configured on the Apache HttpClient; Spring factory wraps it only.
        HttpComponentsClientHttpRequestFactory requestFactory = new HttpComponentsClientHttpRequestFactory(httpClient);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(trimTrailingSlash(properties.getBaseUrl()))
                .requestFactory(requestFactory);

        String overrideHost = properties.getOverrideHost();
        if (StringUtils.hasText(overrideHost)) {
            builder.defaultHeader(HttpHeaders.HOST, overrideHost.trim());
        }
        return builder.build();
    }

    static HttpClient createHttpClient(OllamaProperties properties, Duration connectTimeout, Duration readTimeout) {
        Timeout connect = Timeout.ofMilliseconds(Math.max(1, connectTimeout.toMillis()));
        Timeout read = Timeout.ofMilliseconds(Math.max(1, readTimeout.toMillis()));

        ConnectionConfig connectionConfig = ConnectionConfig.custom()
                .setConnectTimeout(connect)
                .setSocketTimeout(read)
                .build();
        SocketConfig socketConfig = SocketConfig.custom()
                .setSoTimeout(read)
                .build();
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectionRequestTimeout(connect)
                .setResponseTimeout(read)
                .build();

        TlsSocketStrategy tlsStrategy;
        try {
            tlsStrategy = new DefaultClientTlsStrategy(SSLContext.getDefault());
        } catch (Exception e) {
            throw new IllegalStateException("Unable to initialize TLS for Ollama client", e);
        }

        var connectionManagerBuilder = PoolingHttpClientConnectionManagerBuilder.create()
                .setTlsSocketStrategy(tlsStrategy)
                .setDefaultConnectionConfig(connectionConfig)
                .setDefaultSocketConfig(socketConfig)
                .setMaxConnTotal(32)
                .setMaxConnPerRoute(16);

        DnsResolver dnsResolver = createDnsResolver(properties);
        if (dnsResolver != null) {
            connectionManagerBuilder.setDnsResolver(dnsResolver);
        }

        return HttpClients.custom()
                .setConnectionManager(connectionManagerBuilder.build())
                .setDefaultRequestConfig(requestConfig)
                .evictExpiredConnections()
                .evictIdleConnections(Timeout.of(30, TimeUnit.SECONDS))
                .build();
    }

    static DnsResolver createDnsResolver(OllamaProperties properties) {
        String connectIp = properties.getConnectIp();
        if (!StringUtils.hasText(connectIp)) {
            return null;
        }
        String pinnedHost = resolvePinnedHost(properties);
        if (!StringUtils.hasText(pinnedHost)) {
            return null;
        }
        InetAddress pinnedAddress = toInetAddress(pinnedHost.trim(), connectIp.trim());
        String pinnedHostLower = pinnedHost.trim().toLowerCase(Locale.ROOT);
        return new DnsResolver() {
            @Override
            public InetAddress[] resolve(String host) throws UnknownHostException {
                if (host != null && host.trim().toLowerCase(Locale.ROOT).equals(pinnedHostLower)) {
                    return new InetAddress[]{pinnedAddress};
                }
                return InetAddress.getAllByName(host);
            }

            @Override
            public String resolveCanonicalHostname(String host) {
                return host;
            }
        };
    }

    static String resolvePinnedHost(OllamaProperties properties) {
        if (StringUtils.hasText(properties.getTlsServerName())) {
            return properties.getTlsServerName().trim();
        }
        try {
            URI uri = URI.create(properties.getBaseUrl());
            return uri.getHost();
        } catch (Exception e) {
            return null;
        }
    }

    static InetAddress toInetAddress(String hostname, String ipLiteral) {
        try {
            byte[] address = InetAddress.getByName(ipLiteral).getAddress();
            // Preserve hostname on the InetAddress so TLS SNI / verification use MagicDNS name.
            return InetAddress.getByAddress(hostname, address);
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Invalid ollama.connect-ip: " + ipLiteral, e);
        }
    }

    private static String trimTrailingSlash(String baseUrl) {
        if (baseUrl == null) {
            return "";
        }
        String trimmed = baseUrl.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }
}
