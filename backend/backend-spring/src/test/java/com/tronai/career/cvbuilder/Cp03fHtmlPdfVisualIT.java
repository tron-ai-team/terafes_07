package com.tronai.career.cvbuilder;

import com.tronai.career.cvbuilder.gotenberg.GotenbergPdfClient;
import com.tronai.career.cvbuilder.gotenberg.GotenbergProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CP-03F: Chromium HTML→PDF visual evidence for owner-reference 履歴書.
 */
class Cp03fHtmlPdfVisualIT {

    private static final Path ROOT = Path.of("c:/Users/engrm/OneDrive/Desktop/Group7/evidence/cp03f");
    private static final Path PAGES = ROOT.resolve("pages");
    private static final Path PDF = ROOT.resolve("pdf");
    private static final Path HTML = ROOT.resolve("html");
    private static final Path TESTS = ROOT.resolve("tests");
    private static final Path COMPARE = ROOT.resolve("comparisons");

    @Test
    void generateNormalLongNameLongPrAndEnglishEvidence() throws Exception {
        Assumptions.assumeTrue(gotenbergUp(), "Gotenberg not on :3000");
        Files.createDirectories(PAGES);
        Files.createDirectories(PDF);
        Files.createDirectories(HTML);
        Files.createDirectories(TESTS);
        Files.createDirectories(COMPARE);

        CvHtmlPdfRenderer renderer = new CvHtmlPdfRenderer();
        GotenbergPdfClient client = new GotenbergPdfClient(new GotenbergProperties());
        byte[] photo = syntheticIdPhoto();
        String photoUri = CvPhotoSupport.toDataUri(photo, "image/jpeg");

        // Test A — normal Japanese CV with photo
        Map<String, Object> normal = baseJa();
        byte[] htmlA = renderer.renderHtml("RIREKISHO_JA", normal, photoUri);
        Files.write(HTML.resolve("normal.html"), htmlA);
        byte[] pdfA = client.convertHtml(htmlA);
        Files.write(PDF.resolve("normal.pdf"), pdfA);
        rasterize(pdfA, "normal", 2);
        assertPdfText(pdfA, "山田", "新宿", "入学", "卒業", "な　し", "自己");

        // Test B — long foreign name
        Map<String, Object> longName = baseJa();
        longName.put("nameJa", "アレクサンダー・フォン・ホンブルク＝シュミッツ");
        longName.put("furigana", "あれくさんだー・ふぉん・ほんぶるぐ＝しゅみっつ");
        byte[] pdfB = client.convertHtml(renderer.renderHtml("RIREKISHO_JA", longName, null));
        Files.write(PDF.resolve("long_name.pdf"), pdfB);
        rasterize(pdfB, "long_name", 2);
        assertPdfText(pdfB, "アレクサンダー");

        // Test C — long Self PR (must not swallow certifications)
        Map<String, Object> longPr = baseJa();
        longPr.put("selfPr", "私は課題を整理し、原因を検証しながら改善を積み重ねます。チームでの合意形成とテストを重視します。".repeat(12));
        longPr.put("motivationGeneral", "貴社の技術力と成長環境に魅力を感じ志望しました。");
        byte[] pdfC = client.convertHtml(renderer.renderHtml("RIREKISHO_JA", longPr, photoUri));
        Files.write(PDF.resolve("long_selfpr.pdf"), pdfC);
        rasterize(pdfC, "long_selfpr", 2);
        assertPdfText(pdfC, "普通自動車", "志望動機");

        // Test D — address with duplicated postal in addressText
        Map<String, Object> addr = baseJa();
        addr.put("postalCode", "160-0023");
        addr.put("addressText", "〒160-0023 東京都新宿区西新宿2-8-1グランドタワー");
        byte[] htmlD = renderer.renderHtml("RIREKISHO_JA", addr, null);
        Files.write(HTML.resolve("long_address.html"), htmlD);
        assertThat(count(new String(htmlD, StandardCharsets.UTF_8), "160-0023")).isEqualTo(1);
        byte[] pdfD = client.convertHtml(htmlD);
        Files.write(PDF.resolve("long_address.pdf"), pdfD);
        rasterize(pdfD, "long_address", 2);

        // Test F — no photo
        byte[] pdfF = client.convertHtml(renderer.renderHtml("RIREKISHO_JA", baseJa(), null));
        Files.write(PDF.resolve("no_photo.pdf"), pdfF);
        rasterize(pdfF, "no_photo", 2);

        // Test H — English resume regression
        Map<String, Object> en = new HashMap<>();
        en.put("fullName", "Taro Yamada");
        en.put("email", "taro@example.com");
        en.put("phone", "090-1234-5678");
        en.put("selfPr", "Software engineer focused on Spring Boot.");
        en.put("skills", List.of(Map.of("name", "Java"), Map.of("name", "Spring Boot")));
        en.put("education", List.of(Map.of("schoolName", "Tokyo Tech", "endYear", 2020, "endMonth", 3)));
        en.put("workExperience", List.of());
        en.put("projects", List.of());
        en.put("certifications", List.of());
        byte[] enHtml = renderer.renderHtml("RESUME_EN", en, null);
        Files.write(HTML.resolve("resume_en.html"), enHtml);
        byte[] enPdf = client.convertHtml(enHtml);
        Files.write(PDF.resolve("resume_en.pdf"), enPdf);
        rasterize(enPdf, "resume_en", 1);
        assertPdfText(enPdf, "Taro Yamada", "PROFESSIONAL SUMMARY");

        // Side-by-side vs prior broken CP-03E LibreOffice page if present
        Path prior = Path.of("c:/Users/engrm/OneDrive/Desktop/Group7/evidence/cp03e/cp03e_p1.png");
        Path neu = PAGES.resolve("normal_p1.png");
        if (Files.exists(prior) && Files.exists(neu)) {
            BufferedImage a = ImageIO.read(prior.toFile());
            BufferedImage b = ImageIO.read(neu.toFile());
            ImageIO.write(sideBySide(scale(a, 700), scale(b, 700)), "png",
                    COMPARE.resolve("cp03e_vs_cp03f_p1.png").toFile());
        }
        Path refPreview = ROOT.resolve("reference/TRON_Rirekisho_HTML_Preview.pdf");
        if (Files.exists(refPreview)) {
            try (PDDocument doc = Loader.loadPDF(Files.readAllBytes(refPreview))) {
                PDFRenderer r = new PDFRenderer(doc);
                for (int i = 0; i < Math.min(2, doc.getNumberOfPages()); i++) {
                    ImageIO.write(r.renderImageWithDPI(i, 150), "png",
                            COMPARE.resolve("html_preview_ref_p" + (i + 1) + ".png").toFile());
                }
            }
        }
    }

    private static Map<String, Object> baseJa() {
        Map<String, Object> p = new HashMap<>();
        p.put("nameJa", "山田　太郎");
        p.put("furigana", "やまだ　たろう");
        p.put("dateOfBirth", "2002-05-15");
        p.put("nationality", "日本");
        p.put("postalCode", "160-0023");
        p.put("addressText", "東京都新宿区西新宿2-8-1");
        p.put("phone", "090-1234-5678");
        p.put("email", "taro.yamada@example.com");
        p.put("selfPr", "チーム開発と継続学習を大切にしています。");
        p.put("motivationGeneral", "貴社の技術力と成長環境に魅力を感じ志望しました。");
        p.put("favoriteSubjects", "情報処理");
        p.put("hobbies", "読書");
        p.put("healthStatus", "良好");
        p.put("sports", "水泳");
        p.put("extracurricular", "プログラミングサークル");
        p.put("education", List.of(
                Map.of("schoolName", "○○高等学校", "startYear", 2018, "startMonth", 4,
                        "endYear", 2021, "endMonth", 3, "status", "卒業"),
                Map.of("schoolName", "△△大学 情報学部", "startYear", 2021, "startMonth", 4,
                        "endYear", 2025, "endMonth", 3, "status", "卒業見込み")
        ));
        p.put("workExperience", List.of());
        p.put("certifications", List.of(Map.of("name", "普通自動車第一種運転免許", "year", 2021, "month", 6)));
        return p;
    }

    private static void rasterize(byte[] pdf, String prefix, int expectPages) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(expectPages);
            PDFRenderer renderer = new PDFRenderer(doc);
            int n = Math.min(expectPages, doc.getNumberOfPages());
            for (int i = 0; i < n; i++) {
                BufferedImage img = renderer.renderImageWithDPI(i, 200);
                ImageIO.write(img, "png", PAGES.resolve(prefix + "_p" + (i + 1) + ".png").toFile());
            }
        }
    }

    private static void assertPdfText(byte[] pdf, String... mustContain) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(doc);
            for (String s : mustContain) {
                assertThat(text).contains(s);
            }
        }
    }

    private static int count(String hay, String needle) {
        int c = 0, i = 0;
        while ((i = hay.indexOf(needle, i)) >= 0) {
            c++;
            i += needle.length();
        }
        return c;
    }

    private static byte[] syntheticIdPhoto() throws Exception {
        BufferedImage img = new BufferedImage(300, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(210, 225, 240));
        g.fillRect(0, 0, 300, 400);
        g.setColor(new Color(80, 110, 140));
        g.fillOval(90, 70, 120, 140);
        g.fillRect(70, 220, 160, 140);
        g.dispose();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpeg", bos);
        return bos.toByteArray();
    }

    private static BufferedImage scale(BufferedImage src, int width) {
        int h = (int) Math.round(src.getHeight() * (width / (double) src.getWidth()));
        BufferedImage out = new BufferedImage(width, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.drawImage(src, 0, 0, width, h, null);
        g.dispose();
        return out;
    }

    private static BufferedImage sideBySide(BufferedImage left, BufferedImage right) {
        int h = Math.max(left.getHeight(), right.getHeight());
        BufferedImage out = new BufferedImage(left.getWidth() + right.getWidth() + 8, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setColor(Color.DARK_GRAY);
        g.fillRect(0, 0, out.getWidth(), out.getHeight());
        g.drawImage(left, 0, 0, null);
        g.drawImage(right, left.getWidth() + 8, 0, null);
        g.dispose();
        return out;
    }

    private static boolean gotenbergUp() {
        try {
            HttpURLConnection c = (HttpURLConnection) URI.create("http://127.0.0.1:3000/health").toURL().openConnection();
            c.setConnectTimeout(1500);
            c.setReadTimeout(1500);
            int code = c.getResponseCode();
            c.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        }
    }
}
