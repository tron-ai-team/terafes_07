package com.tronai.career.cvbuilder;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.Period;
import java.time.chrono.JapaneseChronology;
import java.time.chrono.JapaneseDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Professional print HTML for Chromium/Gotenberg.
 * Japanese layout follows owner reference {@code TRON_Rirekisho_Reference_Template.html}
 * (measured from {@code x履歴書フォーマット.pdf}). Server-side binding only — no browser JS.
 */
@Component
public class CvHtmlPdfRenderer {

    public static final int MAX_EDU_HISTORY_LINES = 9;
    public static final int MAX_WORK_HISTORY_LINES = 2;
    public static final int MAX_CERT_LINES = 6;
    /** Soft capacity for Self PR box (~134pt / ~9.9pt / 1.48 ≈ 9 lines × ~36 chars). */
    public static final int SELF_PR_SOFT_CHARS = 330;

    private static final Pattern POSTAL_IN_TEXT =
            Pattern.compile("^(?:〒\\s*)?(\\d{3})[-‐ー\\s]?(\\d{4})\\s*");
    private static final DateTimeFormatter WAREKI =
            DateTimeFormatter.ofPattern("Gy年M月d日", Locale.JAPAN).withChronology(JapaneseChronology.INSTANCE);

    private final String rirekishoCss;
    private final String resumeCss;

    public CvHtmlPdfRenderer() {
        String print = loadCss("career/templates/pdf/rirekisho_print.css");
        this.rirekishoCss = print.isBlank() ? loadCss("career/templates/pdf/rirekisho.css") : print;
        this.resumeCss = loadCss("career/templates/pdf/resume_en.css");
    }

    public byte[] renderHtml(String templateCode, Map<String, Object> payload) {
        return renderHtml(templateCode, payload, null);
    }

    public byte[] renderHtml(String templateCode, Map<String, Object> payload, String photoDataUri) {
        Map<String, Object> p = payload == null ? Map.of() : payload;
        String html = "RESUME_EN".equalsIgnoreCase(templateCode)
                ? buildResumeEn(p)
                : buildRirekisho(p, photoDataUri);
        return html.getBytes(StandardCharsets.UTF_8);
    }

    private String buildRirekisho(Map<String, Object> p, String photoDataUri) {
        LocalDate asOf = LocalDate.now();
        JapaneseDate jdAsOf = JapaneseDate.from(asOf);
        String warekiYear = String.valueOf(jdAsOf.get(java.time.temporal.ChronoField.YEAR_OF_ERA));
        String asOfMonth = String.valueOf(asOf.getMonthValue());
        String asOfDay = String.valueOf(asOf.getDayOfMonth());

        String name = firstNonBlank(str(p.get("nameJa")), str(p.get("fullName")));
        String nameClass = name.length() > 16 ? "value field-name long" : "value field-name";
        String furigana = str(p.get("furigana"));
        String dobRaw = str(p.get("dateOfBirth"));
        String birthJa = formatWarekiDate(dobRaw);
        String age = ageLabel(dobRaw, asOf);
        String nationality = str(p.get("nationality"));

        AddressParts address = normalizeAddress(str(p.get("postalCode")), str(p.get("addressText")));
        String addressFurigana = str(p.get("addressFurigana"));
        PhoneParts phones = splitPhones(str(p.get("phone")), str(p.get("mobile")), str(p.get("landline")));
        String email = str(p.get("email"));

        String holidayFurigana = str(p.get("holidayFurigana"));
        String holidayAddress = str(p.get("holidayAddress"));
        String holidayPhone = str(p.get("holidayPhone"));

        String motivation = firstNonBlank(
                str(p.get("motivationCompany")),
                str(p.get("motivationGeneral")),
                str(p.get("careerGoals")));
        String selfPr = str(p.get("selfPr"));
        String personalHope = firstNonBlank(
                str(p.get("personalRequests")),
                str(p.get("employmentPreferences")),
                str(p.get("preferencesText")),
                str(p.get("本人希望")));

        // Keep Self PR inside its box; overflow / 志望動機 / 本人希望 go to continuation region.
        TextSplit pr = splitSelfPr(selfPr);
        String userNotes = str(p.get("additionalNotes"));
        String additionalNotes;
        if (!userNotes.isBlank()) {
            additionalNotes = userNotes;
            if (!pr.continuation().isBlank()) {
                additionalNotes += "\n\n【自己PR（続き）】\n" + pr.continuation();
            }
        } else {
            additionalNotes = buildAdditionalNotes(motivation, personalHope, pr.continuation());
        }

        String photoHtml = photoBlock(photoDataUri);
        String historyRows = buildOwnerHistoryRows(p);
        String certRows = buildOwnerCertRows(p);

        return """
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                <meta charset="UTF-8"/>
                <title>履歴書</title>
                <style>%s</style>
                </head>
                <body>
                <section class="paper" id="cv-page-1" aria-label="履歴書 1ページ">
                  <div class="at title" style="left:107pt;top:52pt;">履 歴 書</div>
                  <div class="at" style="left:264pt;top:59.5pt;font-size:10pt;white-space:nowrap;">令和 %s 年　%s 月　%s 日　現在</div>
                  %s

                  <div class="at form-frame" style="left:50.05pt;top:80.76pt;width:382.74pt;height:62.65pt;"></div>
                  <div class="line v" style="left:113.55pt;top:82.44pt;height:60.17pt;"></div>
                  <div class="line v" style="left:385.4pt;top:82.44pt;height:60.17pt;"></div>
                  <div class="line dotted-h" style="left:51.72pt;top:94.6pt;width:333.68pt;height:0;"></div>
                  <div class="at label" style="left:53pt;top:83pt;width:58pt;height:13pt;">ふりがな</div>
                  <div class="at label" style="left:53pt;top:105pt;width:58pt;height:36pt;display:flex;align-items:center;justify-content:center;">氏名</div>
                  <div class="value furi" style="left:116pt;top:83pt;width:265pt;height:12pt;line-height:1.15;">%s</div>
                  <div class="%s" style="left:116pt;top:99pt;width:266pt;max-height:41pt;">%s</div>
                  <div class="at center" style="left:388pt;top:82pt;width:42pt;font-size:10pt;line-height:1.52;">※<br>男<br>・<br>女</div>

                  <div class="at form-frame" style="left:50.05pt;top:142.59pt;width:382.74pt;height:39.72pt;"></div>
                  <div class="line v" style="left:113.55pt;top:143.4pt;height:38.05pt;"></div>
                  <div class="line v" style="left:291.17pt;top:143.4pt;height:38.05pt;"></div>
                  <div class="line v" style="left:328.87pt;top:143.4pt;height:38.05pt;"></div>
                  <div class="at label" style="left:51pt;top:144pt;width:62pt;height:36pt;display:flex;align-items:center;justify-content:center;">生 年 月 日</div>
                  <div class="value" style="left:117pt;top:146pt;width:171pt;height:18pt;white-space:nowrap;">%s</div>
                  <div class="at center small" style="left:205pt;top:166pt;width:82pt;">（満 %s 歳）</div>
                  <div class="at label" style="left:297pt;top:148pt;width:28pt;height:29pt;">国<br>籍</div>
                  <div class="value small" style="left:331pt;top:153pt;width:98pt;max-height:26pt;">%s</div>
                  <div class="at" style="left:334pt;top:145pt;font-size:6.4pt;">（留学生のみ記入）</div>

                  <div class="at form-frame" style="left:50.05pt;top:181.01pt;width:497.85pt;height:85.25pt;"></div>
                  <div class="line v" style="left:113.55pt;top:182.6pt;height:82.77pt;"></div>
                  <div class="line v" style="left:431.59pt;top:182.6pt;height:82.77pt;"></div>
                  <div class="line dotted-h" style="left:51.72pt;top:199pt;width:380pt;height:0;"></div>
                  <div class="at label" style="left:52pt;top:185pt;width:60pt;height:13pt;">ふりがな</div>
                  <div class="at label" style="left:52pt;top:204pt;width:60pt;height:60pt;display:flex;align-items:center;justify-content:center;">現 住 所</div>
                  <div class="value furi" style="left:117pt;top:184pt;width:311pt;height:13pt;">%s</div>
                  <div class="value" style="left:117pt;top:202pt;width:309pt;max-height:58pt;line-height:1.5;">%s</div>
                  <div class="at small" style="left:435pt;top:184pt;">電話</div>
                  <div class="value" style="left:435pt;top:207pt;width:108pt;max-height:50pt;">%s</div>

                  <div class="at form-frame" style="left:50.05pt;top:265.36pt;width:497.85pt;height:22.81pt;"></div>
                  <div class="line v" style="left:113.55pt;top:266.2pt;height:21.2pt;"></div>
                  <div class="line v" style="left:328.87pt;top:266.2pt;height:21.2pt;"></div>
                  <div class="line v" style="left:431.59pt;top:266.2pt;height:21.2pt;"></div>
                  <div class="at label-small" style="left:52pt;top:273pt;">E-mailアドレス</div>
                  <div class="value compact email-plain" style="left:116pt;top:270pt;width:209pt;max-height:15pt;">%s</div>
                  <div class="at center label-small" style="left:334pt;top:272pt;width:92pt;">携帯電話</div>
                  <div class="value compact center" style="left:434pt;top:271pt;width:110pt;max-height:15pt;">%s</div>

                  <div class="at form-frame" style="left:50.05pt;top:287.33pt;width:497.85pt;height:93.97pt;"></div>
                  <div class="line v" style="left:113.55pt;top:288.17pt;height:92.3pt;"></div>
                  <div class="line v" style="left:431.59pt;top:288.17pt;height:92.3pt;"></div>
                  <div class="line dotted-h" style="left:51.72pt;top:305pt;width:380pt;height:0;"></div>
                  <div class="at label" style="left:52pt;top:289pt;width:60pt;height:14pt;">ふりがな</div>
                  <div class="at label" style="left:52pt;top:313pt;width:60pt;height:63pt;display:flex;align-items:center;justify-content:center;">休暇中の<br>連絡先</div>
                  <div class="at muted" style="left:170pt;top:306pt;width:256pt;white-space:nowrap;">（現住所以外で休暇中に連絡を希望する場合にのみ記入）</div>
                  <div class="value furi" style="left:116pt;top:291pt;width:310pt;max-height:12pt;">%s</div>
                  <div class="value" style="left:116pt;top:325pt;width:308pt;max-height:49pt;">%s</div>
                  <div class="at small" style="left:434pt;top:291pt;">電話</div>
                  <div class="value compact" style="left:434pt;top:324pt;width:108pt;max-height:45pt;">%s</div>

                  <table class="history-table" aria-label="学歴・職歴"><colgroup><col style="width:62pt"><col style="width:28pt"><col></colgroup>
                    <thead><tr><th>年</th><th>月</th><th>学 歴・職 歴（各別にまとめて書く）</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>

                <section class="paper" id="cv-page-2" aria-label="履歴書 2ページ">
                  <div class="at form-frame" style="left:50.05pt;top:64.68pt;width:497.85pt;height:711.7pt;"></div>
                  <div class="line v" style="left:105.86pt;top:66.36pt;height:708.35pt;"></div>
                  <div class="line h" style="left:51.7pt;top:212.1pt;width:494.9pt;"></div>
                  <div class="line h" style="left:51.7pt;top:359pt;width:494.9pt;"></div>
                  <div class="line h" style="left:51.7pt;top:530.35pt;width:494.9pt;"></div>
                  <div class="value free-text prose" style="left:111pt;top:70pt;width:426pt;max-height:136pt;">%s</div>
                  <div class="at label" style="left:51pt;top:258pt;width:52pt;height:70pt;display:flex;align-items:center;justify-content:center;">自己<br>PR</div>
                  <div class="value free-text prose" style="left:110pt;top:218pt;width:429pt;max-height:134pt;">%s</div>
                  <div class="at label" style="left:50pt;top:412pt;width:54pt;height:64pt;display:flex;align-items:center;justify-content:center;">免許<br>・<br>資格</div>
                  <table class="license-table" aria-label="免許・資格"><colgroup><col style="width:64.6pt"><col style="width:40pt"><col></colgroup>
                    <thead><tr><th>年</th><th>月</th><th>免許・資格（取得順に記入）</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                  <div class="line v" style="left:298.49pt;top:531.2pt;height:243.5pt;"></div>
                  <div class="line v" style="left:355.75pt;top:531.2pt;height:243.5pt;"></div>
                  <div class="line h" style="left:51.7pt;top:579.3pt;width:247.6pt;"></div>
                  <div class="line h" style="left:51.7pt;top:628.3pt;width:494.9pt;"></div>
                  <div class="at label" style="left:51pt;top:541pt;width:52pt;height:35pt;">得意<br>科目</div>
                  <div class="at label" style="left:51pt;top:587pt;width:52pt;height:38pt;">健康<br>状態</div>
                  <div class="at label" style="left:51pt;top:667pt;width:52pt;height:69pt;">課外<br>活動<br>・<br>他</div>
                  <div class="at label" style="left:302pt;top:558pt;width:51pt;height:57pt;">趣味<br>・<br>特技</div>
                  <div class="at label" style="left:302pt;top:677pt;width:51pt;height:67pt;">愛好する<br>スポーツ</div>
                  <div class="line h" style="left:106.7pt;top:554.83pt;width:191.8pt;"></div>
                  <div class="line h" style="left:106.7pt;top:603.79pt;width:191.8pt;"></div>
                  <div class="line h" style="left:106.7pt;top:652.78pt;width:191.8pt;"></div>
                  <div class="line h" style="left:106.7pt;top:677.26pt;width:191.8pt;"></div>
                  <div class="line h" style="left:106.7pt;top:701.74pt;width:191.8pt;"></div>
                  <div class="line h" style="left:106.7pt;top:726.22pt;width:191.8pt;"></div>
                  <div class="line h" style="left:106.7pt;top:750.7pt;width:191.8pt;"></div>
                  <div class="line h" style="left:356.6pt;top:554.83pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:579.31pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:603.79pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:652.78pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:677.26pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:701.74pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:726.22pt;width:187.9pt;"></div>
                  <div class="line h" style="left:356.6pt;top:750.7pt;width:187.9pt;"></div>
                  <div class="value compact" style="left:110pt;top:536pt;width:184pt;max-height:39pt;">%s</div>
                  <div class="value compact" style="left:110pt;top:583pt;width:184pt;max-height:40pt;">%s</div>
                  <div class="value compact" style="left:110pt;top:633pt;width:184pt;max-height:139pt;">%s</div>
                  <div class="value compact" style="left:360pt;top:535pt;width:180pt;max-height:89pt;">%s</div>
                  <div class="value compact" style="left:360pt;top:633pt;width:180pt;max-height:139pt;">%s</div>
                </section>
                </body>
                </html>
                """.formatted(
                rirekishoCss,
                esc(warekiYear), esc(asOfMonth), esc(asOfDay),
                photoHtml,
                esc(furigana),
                nameClass, nl(esc(name)),
                esc(birthJa),
                esc(age),
                esc(nationality),
                esc(addressFurigana),
                nl(esc(address.block())),
                esc(phones.landline()),
                esc(email),
                esc(phones.mobile()),
                esc(holidayFurigana),
                nl(esc(holidayAddress)),
                esc(holidayPhone),
                historyRows,
                nl(esc(additionalNotes)),
                nl(esc(pr.primary())),
                certRows,
                esc(str(p.get("favoriteSubjects"))),
                esc(str(p.get("healthStatus"))),
                nl(esc(str(p.get("extracurricular")))),
                nl(esc(str(p.get("hobbies")))),
                nl(esc(str(p.get("sports"))))
        );
    }

    private static String photoBlock(String photoDataUri) {
        if (photoDataUri != null && photoDataUri.startsWith("data:image/")) {
            return "<div class=\"portrait\" id=\"photo-box\"><img src=\"" + photoDataUri
                    + "\" alt=\"本人写真\"/></div>";
        }
        return """
                <div class="portrait" id="photo-box"><span>写真貼付<br>縦4cm<br>横3cm</span></div>
                """;
    }

    private String buildOwnerHistoryRows(Map<String, Object> p) {
        List<HistoryLine> edu = expandEducation(resolveEducation(p));
        edu.sort(CvHtmlPdfRenderer::compareHistory);
        List<Map<String, Object>> work = asMaps(p.get("workExperience"));

        StringBuilder sb = new StringBuilder();
        sb.append(markerRow("学　歴"));
        for (int i = 0; i < MAX_EDU_HISTORY_LINES; i++) {
            if (i < edu.size()) sb.append(historyRow(edu.get(i), false));
            else sb.append(historyRow(new HistoryLine("", "", ""), false));
        }
        sb.append(markerRow("職　歴"));
        if (work.isEmpty()) {
            sb.append(historyRow(new HistoryLine("", "", "な　し"), false));
            sb.append(historyRow(new HistoryLine("", "", ""), false));
        } else {
            int n = 0;
            for (Map<String, Object> row : work) {
                if (n >= MAX_WORK_HISTORY_LINES) break;
                YearMonthParts ym = yearMonthParts(row);
                sb.append(historyRow(new HistoryLine(ym.year(), ym.month(), workLabel(row)), false));
                n++;
            }
            while (n < MAX_WORK_HISTORY_LINES) {
                sb.append(historyRow(new HistoryLine("", "", ""), false));
                n++;
            }
        }
        sb.append(markerRow("賞　罰"));
        sb.append(tailRow("以上"));
        return sb.toString();
    }

    private String buildOwnerCertRows(Map<String, Object> p) {
        List<Map<String, Object>> certs = asMaps(p.get("certifications"));
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < MAX_CERT_LINES; i++) {
            if (i < certs.size()) {
                Map<String, Object> row = certs.get(i);
                YearMonthParts ym = yearMonthParts(row);
                sb.append("<tr><td class=\"y\">").append(esc(ym.year()))
                        .append("</td><td class=\"m\">").append(esc(ym.month()))
                        .append("</td><td class=\"detail\">").append(esc(certLabel(row)))
                        .append("</td></tr>");
            } else {
                sb.append("<tr><td class=\"y\"></td><td class=\"m\"></td><td class=\"detail\"></td></tr>");
            }
        }
        return sb.toString();
    }

    private static String markerRow(String text) {
        return "<tr class=\"marker\"><td class=\"y\"></td><td class=\"m\"></td><td class=\"detail\">"
                + esc(text) + "</td></tr>";
    }

    private static String tailRow(String text) {
        return "<tr class=\"tail\"><td class=\"y\"></td><td class=\"m\"></td><td class=\"detail\">"
                + esc(text) + "</td></tr>";
    }

    private static String historyRow(HistoryLine line, boolean unused) {
        return "<tr><td class=\"y\">" + esc(line.year()) + "</td><td class=\"m\">" + esc(line.month())
                + "</td><td class=\"detail\">" + esc(line.text()) + "</td></tr>";
    }

    private List<Map<String, Object>> resolveEducation(Map<String, Object> p) {
        List<Map<String, Object>> kept = new ArrayList<>(CvEducationSanitizer.resolveForExport(p));
        kept.sort((a, b) -> Integer.compare(earliestYear(a), earliestYear(b)));
        return kept;
    }

    private static int earliestYear(Map<String, Object> row) {
        Integer sy = asInt(row.get("startYear"));
        Integer ey = asInt(row.get("endYear"));
        if (sy != null && ey != null) return Math.min(sy, ey);
        if (sy != null) return sy;
        if (ey != null) return ey;
        return Integer.MAX_VALUE;
    }

    private List<HistoryLine> expandEducation(List<Map<String, Object>> edu) {
        List<HistoryLine> out = new ArrayList<>();
        for (Map<String, Object> row : edu) {
            String school = eduLabel(row);
            String status = str(row.get("status"));
            Integer sy = asInt(row.get("startYear"));
            Integer sm = asInt(row.get("startMonth"));
            Integer ey = asInt(row.get("endYear"));
            Integer em = asInt(row.get("endMonth"));
            if (ey == null) ey = asInt(row.get("year"));
            if (em == null) em = asInt(row.get("month"));

            boolean wrote = false;
            if (sy != null) {
                out.add(new HistoryLine(String.valueOf(sy), sm == null ? "" : String.valueOf(sm), school + "　入学"));
                wrote = true;
            }
            if (ey != null) {
                String lower = status.toLowerCase(Locale.ROOT);
                String grad;
                if (status.contains("見込み") || lower.contains("expected") || lower.contains("planned")) {
                    grad = "卒業見込み";
                } else if (status.contains("在学") || lower.contains("studying") || lower.contains("enrolled")) {
                    grad = "在学中";
                } else if (status.contains("修了")) {
                    grad = status;
                } else {
                    grad = "卒業";
                }
                out.add(new HistoryLine(String.valueOf(ey), em == null ? "" : String.valueOf(em), school + "　" + grad));
                wrote = true;
            }
            if (!wrote && !school.isBlank()) {
                out.add(new HistoryLine("", "", school + (status.isBlank() ? "" : "　" + status)));
            }
        }
        return out;
    }

    private record HistoryLine(String year, String month, String text) {}

    private static int compareHistory(HistoryLine a, HistoryLine b) {
        int ay = parseYear(a.year());
        int by = parseYear(b.year());
        if (ay != by) return Integer.compare(ay, by);
        return Integer.compare(parseYear(a.month()), parseYear(b.month()));
    }

    private static int parseYear(String s) {
        if (s == null || s.isBlank()) return Integer.MAX_VALUE / 4;
        try {
            return Integer.parseInt(s.replaceAll("\\D", ""));
        } catch (Exception e) {
            return Integer.MAX_VALUE / 4;
        }
    }

    public record AddressParts(String postal, String street, String block) {}

    public static AddressParts normalizeAddress(String postalRaw, String addressRaw) {
        String street = addressRaw == null ? "" : addressRaw.trim();
        String postal = formatPostal(postalRaw);
        Matcher m = POSTAL_IN_TEXT.matcher(street);
        if (m.find()) {
            String embedded = m.group(1) + "-" + m.group(2);
            if (postal.isBlank()) postal = embedded;
            street = street.substring(m.end()).trim();
        }
        // Also strip leading 〒xxx if still present without regex match edge cases
        street = street.replaceFirst("^〒\\s*", "").trim();
        if (!postal.isBlank() && street.startsWith(postal)) {
            street = street.substring(postal.length()).trim();
            street = street.replaceFirst("^[-‐ー\\s]+", "").trim();
        }
        String block;
        if (!postal.isBlank() && !street.isBlank()) {
            block = "〒" + postal + "\n" + street;
        } else if (!postal.isBlank()) {
            block = "〒" + postal;
        } else {
            block = street;
        }
        return new AddressParts(postal, street, block);
    }

    private static String formatPostal(String raw) {
        if (raw == null) return "";
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() == 7) return digits.substring(0, 3) + "-" + digits.substring(3);
        return raw.replace("〒", "").trim();
    }

    public record PhoneParts(String landline, String mobile) {}

    public static PhoneParts splitPhones(String phone, String mobileExplicit, String landlineExplicit) {
        String mobile = firstNonBlank(mobileExplicit);
        String landline = firstNonBlank(landlineExplicit);
        String primary = str(phone);
        if (!mobile.isBlank() || !landline.isBlank()) {
            if (mobile.isBlank() && looksMobile(primary)) mobile = primary;
            else if (landline.isBlank() && !primary.isBlank() && !primary.equals(mobile)) landline = primary;
            return new PhoneParts(landline, mobile);
        }
        if (primary.isBlank()) return new PhoneParts("", "");
        if (looksMobile(primary)) return new PhoneParts("", primary);
        return new PhoneParts(primary, "");
    }

    private static boolean looksMobile(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        return digits.startsWith("090") || digits.startsWith("080") || digits.startsWith("070")
                || digits.startsWith("060") || phone.trim().startsWith("+81");
    }

    private record TextSplit(String primary, String continuation) {}

    static TextSplit splitSelfPr(String selfPr) {
        if (selfPr == null || selfPr.isBlank()) return new TextSplit("", "");
        if (selfPr.length() <= SELF_PR_SOFT_CHARS) return new TextSplit(selfPr, "");
        // Break on paragraph / sentence boundary near soft limit — never silent-drop.
        int cut = SELF_PR_SOFT_CHARS;
        int para = selfPr.lastIndexOf('\n', cut);
        if (para >= SELF_PR_SOFT_CHARS / 2) cut = para;
        else {
            int jaPeriod = selfPr.lastIndexOf('。', cut);
            int enPeriod = selfPr.lastIndexOf('.', cut);
            int period = Math.max(jaPeriod, enPeriod);
            if (period >= SELF_PR_SOFT_CHARS / 2) cut = period + 1;
        }
        String primary = selfPr.substring(0, cut).trim();
        String rest = selfPr.substring(cut).trim();
        return new TextSplit(primary, rest);
    }

    private static String buildAdditionalNotes(String motivation, String personalHope, String prContinuation) {
        StringBuilder sb = new StringBuilder();
        if (!motivation.isBlank()) {
            sb.append("【志望動機】\n").append(motivation.trim());
        }
        if (!prContinuation.isBlank()) {
            if (!sb.isEmpty()) sb.append("\n\n");
            sb.append("【自己PR（続き）】\n").append(prContinuation);
        }
        if (!personalHope.isBlank()) {
            if (!sb.isEmpty()) sb.append("\n\n");
            sb.append("【本人希望】\n").append(personalHope.trim());
        }
        return sb.toString();
    }

    private String buildResumeEn(Map<String, Object> p) {
        String name = firstNonBlank(str(p.get("fullName")), str(p.get("nameJa")));
        String email = str(p.get("email"));
        String phone = str(p.get("phone"));
        String address = str(p.get("addressText"));
        String summary = firstNonBlank(str(p.get("careerSummary")), str(p.get("selfPr")));
        String goals = str(p.get("careerGoals"));

        StringBuilder edu = new StringBuilder();
        for (Map<String, Object> row : asMaps(p.get("education"))) {
            edu.append("<li><strong>").append(esc(eduLabel(row))).append("</strong>");
            YearMonthParts ym = yearMonthParts(row);
            String d = formatEnYm(ym);
            if (!d.isBlank()) edu.append(" <span class=\"muted\">(").append(esc(d)).append(")</span>");
            String st = str(row.get("status"));
            if (!st.isBlank()) edu.append(" — ").append(esc(st));
            edu.append("</li>");
        }
        if (edu.isEmpty()) edu.append("<li class=\"muted\">—</li>");

        StringBuilder work = new StringBuilder();
        for (Map<String, Object> row : asMaps(p.get("workExperience"))) {
            work.append("<li><strong>").append(esc(workLabel(row))).append("</strong>");
            String d = formatEnYm(yearMonthParts(row));
            if (!d.isBlank()) work.append(" <span class=\"muted\">(").append(esc(d)).append(")</span>");
            String desc = firstNonBlank(str(row.get("description")), str(row.get("responsibilities")));
            if (!desc.isBlank()) work.append("<div class=\"desc\">").append(esc(desc)).append("</div>");
            work.append("</li>");
        }
        if (work.isEmpty()) work.append("<li class=\"muted\">—</li>");

        StringBuilder projects = new StringBuilder();
        for (Map<String, Object> row : asMaps(p.get("projects"))) {
            String title = firstNonBlank(str(row.get("name")), str(row.get("title")), str(row.get("projectName")));
            String desc = firstNonBlank(str(row.get("description")), str(row.get("summary")));
            projects.append("<li><strong>").append(esc(title)).append("</strong>");
            if (!desc.isBlank()) projects.append("<div class=\"desc\">").append(esc(desc)).append("</div>");
            projects.append("</li>");
        }
        if (projects.isEmpty()) projects.append("<li class=\"muted\">—</li>");

        StringBuilder skills = new StringBuilder();
        List<Map<String, Object>> skillRows = asMaps(p.get("skills"));
        if (skillRows.isEmpty() && p.get("skills") instanceof String s && !s.isBlank()) {
            skills.append(esc(s));
        } else {
            List<String> labels = new ArrayList<>();
            for (Map<String, Object> row : skillRows) {
                String label = firstNonBlank(str(row.get("name")), str(row.get("skill")), str(row.get("label")));
                if (!label.isBlank()) labels.add(label);
            }
            skills.append(esc(String.join(" · ", labels)));
        }
        if (skills.isEmpty()) skills.append("—");

        StringBuilder certs = new StringBuilder();
        for (Map<String, Object> row : asMaps(p.get("certifications"))) {
            certs.append("<li>").append(esc(certLabel(row)));
            String d = formatEnYm(yearMonthParts(row));
            if (!d.isBlank()) certs.append(" <span class=\"muted\">(").append(esc(d)).append(")</span>");
            certs.append("</li>");
        }
        if (certs.isEmpty()) certs.append("<li class=\"muted\">—</li>");

        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8"/>
                <title>Resume</title>
                <style>%s</style>
                </head>
                <body>
                <header>
                  <h1>%s</h1>
                  <div class="contact">%s</div>
                </header>
                <h2>Professional Summary</h2>
                <div class="summary">%s</div>
                %s
                <h2>Education</h2>
                <ul>%s</ul>
                <h2>Technical Skills</h2>
                <div>%s</div>
                <h2>Work Experience</h2>
                <ul>%s</ul>
                <h2>Projects</h2>
                <ul>%s</ul>
                <h2>Certifications</h2>
                <ul>%s</ul>
                </body>
                </html>
                """.formatted(
                resumeCss.isBlank() ? defaultResumeCss() : resumeCss,
                esc(name),
                esc(joinContact(email, phone, address)),
                esc(summary),
                goals.isBlank() ? "" : "<h2>Career Goals</h2><div class=\"summary\">" + esc(goals) + "</div>",
                edu, skills, work, projects, certs
        );
    }

    private static String defaultResumeCss() {
        return """
                @page{size:A4;margin:16mm 18mm}
                body{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:10.5pt;color:#1a1a1a;line-height:1.45;margin:0}
                header{border-bottom:2.5px solid #1a1a1a;padding-bottom:10px;margin-bottom:16px}
                h1{margin:0 0 6px;font-size:22pt}
                .contact{font-size:9.5pt;color:#333}
                h2{font-size:11pt;text-transform:uppercase;letter-spacing:.08em;margin:16px 0 6px;border-bottom:1px solid #bbb;padding-bottom:3px}
                ul{margin:0;padding-left:18px}li{margin-bottom:6px}
                .desc{margin-top:2px;font-size:9.5pt;color:#333;white-space:pre-wrap;word-break:break-word}
                .muted{color:#666}.summary{white-space:pre-wrap;word-break:break-word}
                """;
    }

    private static String ageLabel(String iso, LocalDate asOf) {
        if (iso == null || iso.isBlank()) return "";
        try {
            LocalDate dob = LocalDate.parse(iso.substring(0, Math.min(10, iso.length())));
            int years = Period.between(dob, asOf).getYears();
            return years >= 0 && years < 120 ? String.valueOf(years) : "";
        } catch (Exception e) {
            return "";
        }
    }

    private static String formatWarekiDate(String iso) {
        if (iso == null || iso.isBlank()) return "";
        try {
            LocalDate d = LocalDate.parse(iso.substring(0, Math.min(10, iso.length())));
            return WAREKI.format(JapaneseDate.from(d));
        } catch (Exception e) {
            return formatJaDate(iso);
        }
    }

    private static String formatJaDate(String iso) {
        if (iso == null || iso.isBlank()) return "";
        try {
            LocalDate d = LocalDate.parse(iso.substring(0, Math.min(10, iso.length())));
            return d.format(DateTimeFormatter.ofPattern("yyyy年M月d日"));
        } catch (Exception e) {
            return iso;
        }
    }

    private static YearMonthParts yearMonthParts(Map<String, Object> row) {
        Integer y = firstInt(row.get("endYear"), row.get("year"), row.get("startYear"));
        Integer m = firstInt(row.get("endMonth"), row.get("month"), row.get("startMonth"));
        String date = firstNonBlank(str(row.get("date")), str(row.get("endDate")),
                str(row.get("graduationDate")), str(row.get("dateObtained")));
        if (y == null && !date.isBlank() && date.length() >= 7) {
            try {
                LocalDate d = LocalDate.parse(date.substring(0, Math.min(10, date.length())));
                y = d.getYear();
                m = d.getMonthValue();
            } catch (Exception ignored) {
            }
        }
        return new YearMonthParts(y == null ? "" : String.valueOf(y), m == null ? "" : String.valueOf(m));
    }

    private static String formatEnYm(YearMonthParts ym) {
        if (ym.year().isBlank()) return "";
        if (ym.month().isBlank()) return ym.year();
        try {
            int mi = Integer.parseInt(ym.month());
            return String.format(Locale.ENGLISH, "%s/%02d", ym.year(), mi);
        } catch (Exception e) {
            return ym.year() + "-" + ym.month();
        }
    }

    private record YearMonthParts(String year, String month) {}

    private static String joinContact(String email, String phone, String address) {
        List<String> parts = new ArrayList<>();
        if (!email.isBlank()) parts.add(email);
        if (!phone.isBlank()) parts.add(phone);
        if (!address.isBlank()) parts.add(address);
        return String.join(" · ", parts);
    }

    private static String eduLabel(Map<String, Object> row) {
        String school = firstNonBlank(str(row.get("schoolName")), str(row.get("school")), str(row.get("institution")));
        String detail = firstNonBlank(str(row.get("department")), str(row.get("course")));
        // Avoid appending English noise / duplicate school
        if (!detail.isBlank() && !detail.equals(school)
                && !detail.toLowerCase(Locale.ROOT).matches(".*(graduat|student|currently).*")) {
            return school.isBlank() ? detail : school + "　" + detail;
        }
        return school;
    }

    private static String workLabel(Map<String, Object> row) {
        String company = firstNonBlank(str(row.get("company")), str(row.get("employer")),
                str(row.get("organization")), str(row.get("detail")));
        String title = firstNonBlank(str(row.get("title")), str(row.get("role")), str(row.get("position")), str(row.get("jobTitle")));
        if (!company.isBlank() && !title.isBlank() && !company.equals(title)) return company + "　" + title;
        return firstNonBlank(company, title);
    }

    private static String certLabel(Map<String, Object> row) {
        return firstNonBlank(str(row.get("name")), str(row.get("title")),
                str(row.get("certification")), str(row.get("qualification")));
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asMaps(Object raw) {
        if (!(raw instanceof List<?> list)) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) out.add((Map<String, Object>) m);
        }
        return out;
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        String s = String.valueOf(o).trim();
        if (s.isBlank() || "null".equalsIgnoreCase(s)) return null;
        try {
            return Integer.parseInt(s.replaceAll("\\.0$", "").replaceAll("[^0-9-]", ""));
        } catch (Exception e) {
            return null;
        }
    }

    private static Integer firstInt(Object... values) {
        if (values == null) return null;
        for (Object v : values) {
            Integer i = asInt(v);
            if (i != null) return i;
        }
        return null;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    /** Escape HTML then preserve newlines as &lt;br/&gt; for pre-wrap regions when needed. */
    private static String esc(String s) {
        if (s == null || s.isEmpty()) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String nl(String escaped) {
        return escaped == null ? "" : escaped.replace("\n", "<br/>");
    }

    private static String loadCss(String path) {
        try {
            ClassPathResource res = new ClassPathResource(path);
            if (!res.exists()) return "";
            try (InputStream in = res.getInputStream()) {
                return new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            return "";
        }
    }
}
