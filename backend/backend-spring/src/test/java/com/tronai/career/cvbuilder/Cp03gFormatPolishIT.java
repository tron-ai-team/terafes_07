package com.tronai.career.cvbuilder;

import com.tronai.career.cvbuilder.gotenberg.GotenbergPdfClient;
import com.tronai.career.cvbuilder.gotenberg.GotenbergProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
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
import static org.assertj.core.api.Assertions.within;

/**
 * CP-03G: typography / alignment polish evidence via Chromium (no architecture change).
 */
class Cp03gFormatPolishIT {

    private static final Path ROOT = Path.of("c:/Users/engrm/OneDrive/Desktop/Group7/evidence/cp03g");
    private static final Path AFTER = ROOT.resolve("after");
    private static final Path COMPARE = ROOT.resolve("comparisons");
    private static final Path TESTS = ROOT.resolve("tests");

    @Test
    void polishRegressionSuite() throws Exception {
        Assumptions.assumeTrue(gotenbergUp(), "Gotenberg not on :3000");
        Files.createDirectories(AFTER);
        Files.createDirectories(COMPARE);
        Files.createDirectories(TESTS);

        CvHtmlPdfRenderer renderer = new CvHtmlPdfRenderer();
        GotenbergPdfClient client = new GotenbergPdfClient(new GotenbergProperties());
        String photoUri = CvPhotoSupport.toDataUri(syntheticIdPhoto(), "image/jpeg");

        // A — normal
        Map<String, Object> normal = baseJa();
        byte[] htmlA = renderer.renderHtml("RIREKISHO_JA", normal, photoUri);
        assertThat(new String(htmlA, StandardCharsets.UTF_8)).contains("prose");
        assertThat(new String(htmlA, StandardCharsets.UTF_8)).contains("left:50.05pt"); // aligned page-2 frame
        byte[] pdfA = client.convertHtml(htmlA);
        Files.write(AFTER.resolve("normal.pdf"), pdfA);
        Files.write(AFTER.resolve("normal.html"), htmlA);
        rasterize(pdfA, AFTER, "normal", 2);
        assertExactlyTwoA4(pdfA);
        assertPdfText(pdfA, "山田", "〒160-0023", "090-1234-5678", "入学", "普通自動車");
        assertThat(count(new String(htmlA, StandardCharsets.UTF_8), "160-0023")).isEqualTo(1);

        // B — long name
        Map<String, Object> longName = baseJa();
        longName.put("nameJa", "アレクサンダー・フォン・ホンブルク＝シュミッツ");
        longName.put("furigana", "あれくさんだー・ふぉん・ほんぶるぐ＝しゅみっつ");
        byte[] pdfB = client.convertHtml(renderer.renderHtml("RIREKISHO_JA", longName, null));
        Files.write(AFTER.resolve("long_name.pdf"), pdfB);
        rasterize(pdfB, AFTER, "long_name", 2);
        assertExactlyTwoA4(pdfB);
        assertPdfText(pdfB, "アレクサンダー");

        // C — long Self PR (must not swallow certs)
        Map<String, Object> longPr = baseJa();
        longPr.put("selfPr", "私は課題を整理し、原因を検証しながら改善を積み重ねます。チームでの合意形成とテストを重視します。".repeat(12));
        longPr.put("motivationGeneral", "貴社の技術力と成長環境に魅力を感じ志望しました。");
        byte[] htmlC = renderer.renderHtml("RIREKISHO_JA", longPr, photoUri);
        assertThat(new String(htmlC, StandardCharsets.UTF_8)).contains("【自己PR（続き）】");
        byte[] pdfC = client.convertHtml(htmlC);
        Files.write(AFTER.resolve("long_selfpr.pdf"), pdfC);
        rasterize(pdfC, AFTER, "long_selfpr", 2);
        assertExactlyTwoA4(pdfC);
        assertPdfText(pdfC, "普通自動車", "志望動機");

        // D — long address with duplicated postal
        Map<String, Object> addr = baseJa();
        addr.put("postalCode", "160-0023");
        addr.put("addressText", "〒160-0023 東京都新宿区西新宿2-8-1グランドタワー42階");
        byte[] htmlD = renderer.renderHtml("RIREKISHO_JA", addr, null);
        assertThat(count(new String(htmlD, StandardCharsets.UTF_8), "160-0023")).isEqualTo(1);
        byte[] pdfD = client.convertHtml(htmlD);
        Files.write(AFTER.resolve("long_address.pdf"), pdfD);
        rasterize(pdfD, AFTER, "long_address", 2);

        // E — missing optional
        Map<String, Object> sparse = new HashMap<>();
        sparse.put("nameJa", "佐藤");
        sparse.put("furigana", "さとう");
        sparse.put("workExperience", List.of());
        sparse.put("education", List.of());
        sparse.put("certifications", List.of());
        byte[] pdfE = client.convertHtml(renderer.renderHtml("RIREKISHO_JA", sparse, null));
        Files.write(AFTER.resolve("sparse.pdf"), pdfE);
        rasterize(pdfE, AFTER, "sparse", 2);
        assertExactlyTwoA4(pdfE);
        assertPdfText(pdfE, "佐藤", "な　し");

        // F — photo box present
        assertThat(new String(htmlA, StandardCharsets.UTF_8)).contains("portrait");
        assertThat(new String(htmlA, StandardCharsets.UTF_8)).contains("85.05pt");

        // Before/after side-by-side
        Path before1 = ROOT.resolve("before/p1.png");
        Path after1 = AFTER.resolve("normal_p1.png");
        Path before2 = ROOT.resolve("before/p2.png");
        Path after2 = AFTER.resolve("normal_p2.png");
        if (Files.exists(before1) && Files.exists(after1)) {
            ImageIO.write(sideBySide(scale(ImageIO.read(before1.toFile()), 700),
                    scale(ImageIO.read(after1.toFile()), 700)), "png",
                    COMPARE.resolve("before_after_p1.png").toFile());
        }
        if (Files.exists(before2) && Files.exists(after2)) {
            ImageIO.write(sideBySide(scale(ImageIO.read(before2.toFile()), 700),
                    scale(ImageIO.read(after2.toFile()), 700)), "png",
                    COMPARE.resolve("before_after_p2.png").toFile());
        }
        // Page1 vs page2 form left-edge visual strip for alignment check
        if (Files.exists(after1) && Files.exists(after2)) {
            BufferedImage p1 = ImageIO.read(after1.toFile());
            BufferedImage p2 = ImageIO.read(after2.toFile());
            ImageIO.write(sideBySide(scale(p1, 550), scale(p2, 550)), "png",
                    COMPARE.resolve("p1_vs_p2_alignment.png").toFile());
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

    private static void assertExactlyTwoA4(byte[] pdf) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
            for (int i = 0; i < 2; i++) {
                PDRectangle box = doc.getPage(i).getMediaBox();
                // A4 in points (~595.28 × 841.89); allow small Chromium rounding.
                assertThat(box.getWidth()).isCloseTo(595.28f, within(4f));
                assertThat(box.getHeight()).isCloseTo(841.89f, within(4f));
                assertThat(box.getWidth()).isLessThan(610f); // not US Letter (612)
            }
        }
    }

    private static void rasterize(byte[] pdf, Path dir, String prefix, int pages) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            for (int i = 0; i < Math.min(pages, doc.getNumberOfPages()); i++) {
                ImageIO.write(renderer.renderImageWithDPI(i, 220), "png",
                        dir.resolve(prefix + "_p" + (i + 1) + ".png").toFile());
            }
        }
    }

    private static void assertPdfText(byte[] pdf, String... must) throws Exception {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(doc);
            for (String s : must) assertThat(text).contains(s);
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
