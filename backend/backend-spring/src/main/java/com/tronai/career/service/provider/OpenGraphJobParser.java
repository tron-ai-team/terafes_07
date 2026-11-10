package com.tronai.career.service.provider;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts verified job fields from publicly available HTML metadata (Open Graph / title).
 * Does not invent missing fields — uses UNKNOWN / null / empty when absent.
 */
public final class OpenGraphJobParser {

    private static final Pattern CAREERMAP_TITLE =
            Pattern.compile("^(.+?)の(.+?)\\s*求人");
    private static final Pattern PREFECTURE = Pattern.compile(
            "(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|"
                    + "新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|"
                    + "奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|"
                    + "長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)");

    private OpenGraphJobParser() {}

    public static ExternalJobListing parseCareerMapJob(String url, String html, Instant verifiedAt) {
        if (html == null || html.isBlank()) {
            return null;
        }
        Document doc = Jsoup.parse(html, url);
        String ogTitle = meta(doc, "og:title");
        String ogDesc = meta(doc, "og:description");
        String titleTag = doc.title();
        String rawTitle = firstNonBlank(ogTitle, titleTag);
        if (rawTitle == null || rawTitle.isBlank()) {
            return null;
        }
        // Reject soft-404 / login walls that lack a job title pattern.
        if (!rawTitle.contains("求人") && !url.toLowerCase(Locale.ROOT).contains("/jobs/")) {
            return null;
        }

        String company = null;
        String role = null;
        Matcher m = CAREERMAP_TITLE.matcher(rawTitle);
        if (m.find()) {
            company = m.group(1).trim();
            role = m.group(2).trim();
        }
        if (company == null || company.isBlank()) {
            company = "Unknown";
        }
        String title = role != null && !role.isBlank() ? role : stripSiteSuffix(rawTitle);

        String location = extractPrefecture(ogDesc);
        String description = ogDesc != null ? ogDesc.trim() : "";
        List<String> tags = inferTags(title + " " + description);

        String sourceId = extractJobId(url);
        return ExternalJobListing.builder()
                .provider("careermap")
                .sourceId(sourceId != null ? sourceId : Integer.toHexString(url.hashCode()))
                .sourceUrl(canonicalize(url))
                .title(title)
                .company(company)
                .location(location != null ? location : "")
                .employmentType(null)
                .newGraduateEligible(null)
                .description(description)
                .tags(tags)
                .publishedAt(verifiedAt)
                .lastVerifiedAt(verifiedAt)
                .applicationStatus("UNKNOWN")
                .internationalStudentPolicy("UNKNOWN")
                .graduationYear(null)
                .verificationNotes("Verified via public CareerMap Open Graph metadata; "
                        + "application eligibility not confirmed without membership.")
                .build();
    }

    public static ExternalJobListing parseMynaviImport(String url, String html, Instant verifiedAt) {
        if (html == null || html.isBlank()) {
            return ExternalJobListing.builder()
                    .provider("mynavi")
                    .sourceId(Integer.toHexString(url.hashCode()))
                    .sourceUrl(url)
                    .title("Imported Mynavi page")
                    .company("Unknown")
                    .location("")
                    .description("")
                    .tags(List.of("mynavi"))
                    .publishedAt(verifiedAt)
                    .lastVerifiedAt(verifiedAt)
                    .applicationStatus("UNKNOWN")
                    .internationalStudentPolicy("UNKNOWN")
                    .verificationNotes("URL imported; page metadata unavailable. Not confirmed as open vacancy.")
                    .build();
        }
        Document doc = Jsoup.parse(html, url);
        String ogTitle = meta(doc, "og:title");
        String titleTag = doc.title();
        String raw = firstNonBlank(ogTitle, titleTag, "Imported Mynavi page");
        String company = stripSiteSuffix(raw);
        return ExternalJobListing.builder()
                .provider("mynavi")
                .sourceId(Integer.toHexString(url.hashCode()))
                .sourceUrl(url)
                .title(company)
                .company(company)
                .location("")
                .description(meta(doc, "og:description") != null ? meta(doc, "og:description") : "")
                .tags(List.of("mynavi"))
                .publishedAt(verifiedAt)
                .lastVerifiedAt(verifiedAt)
                .applicationStatus("UNKNOWN")
                .internationalStudentPolicy("UNKNOWN")
                .newGraduateEligible(url.contains("/27/") || url.contains("/2027/") ? Boolean.TRUE : null)
                .verificationNotes("Imported from user-supplied Mynavi URL. Company page ≠ confirmed open vacancy "
                        + "unless stated on the source page.")
                .build();
    }

    public static List<String> extractJobIdsFromHtml(String html) {
        List<String> ids = new ArrayList<>();
        if (html == null) return ids;
        Matcher m = Pattern.compile("/jobs/(\\d+)").matcher(html);
        while (m.find()) {
            String id = m.group(1);
            if (!ids.contains(id)) {
                ids.add(id);
            }
        }
        return ids;
    }

    public static List<String> extractJobUrlsFromSitemap(String xml) {
        List<String> urls = new ArrayList<>();
        if (xml == null) return urls;
        Matcher m = Pattern.compile("<loc>\\s*(https://www\\.careermap\\.jp/jobs/\\d+)\\s*</loc>").matcher(xml);
        while (m.find()) {
            urls.add(m.group(1));
        }
        return urls;
    }

    private static String meta(Document doc, String property) {
        var el = doc.selectFirst("meta[property=" + property + "]");
        if (el == null) {
            el = doc.selectFirst("meta[name=" + property + "]");
        }
        if (el == null) return null;
        String content = el.attr("content");
        return content == null || content.isBlank() ? null : content.trim();
    }

    private static String extractPrefecture(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher m = PREFECTURE.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static List<String> inferTags(String hay) {
        List<String> tags = new ArrayList<>();
        String h = hay == null ? "" : hay.toLowerCase(Locale.ROOT);
        String[] needles = {
                "Java", "Spring", "Python", "JavaScript", "TypeScript", "React", "AWS", "Docker",
                "システムエンジニア", "Webエンジニア", "プログラマー", "バックエンド", "インフラ", "ネットワーク"
        };
        for (String n : needles) {
            if (h.contains(n.toLowerCase(Locale.ROOT))) {
                tags.add(n);
            }
        }
        return tags;
    }

    private static String extractJobId(String url) {
        Matcher m = Pattern.compile("/jobs/(\\d+)").matcher(url);
        return m.find() ? m.group(1) : null;
    }

    private static String canonicalize(String url) {
        try {
            URI u = URI.create(url);
            return u.getScheme() + "://" + u.getHost() + u.getPath();
        } catch (Exception e) {
            return url;
        }
    }

    private static String stripSiteSuffix(String title) {
        if (title == null) return "";
        return title.replaceAll("\\s*\\|\\s*.*$", "").replaceAll("\\s*求人\\s*$", "").trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }
}
