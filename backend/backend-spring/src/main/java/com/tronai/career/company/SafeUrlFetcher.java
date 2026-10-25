package com.tronai.career.company;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.InetAddress;
import java.net.URI;
import java.util.Locale;

@Component
public class SafeUrlFetcher {

    public Document fetch(String url) {
        validate(url);
        try {
            return Jsoup.connect(url)
                    .userAgent("TRON-CareerCenter/1.0")
                    .timeout(12000)
                    .followRedirects(true)
                    .maxBodySize(512_000)
                    .get();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to fetch URL: " + e.getMessage());
        }
    }

    public void validate(String url) {
        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL required");
        }
        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only http/https allowed");
        }
        String host = uri.getHost();
        if (host == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host required");
        }
        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr.isAnyLocalAddress() || addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                    || addr.isSiteLocalAddress() || addr.isMulticastAddress()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Private/internal hosts are blocked (SSRF)");
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to resolve host");
        }
    }
}
