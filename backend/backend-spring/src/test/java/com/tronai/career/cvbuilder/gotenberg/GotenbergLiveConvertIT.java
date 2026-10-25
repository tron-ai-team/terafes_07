package com.tronai.career.cvbuilder.gotenberg;

import com.tronai.career.cvbuilder.AlternateCvWorkbookExporter;
import com.tronai.career.cvbuilder.RirekishoExcelFiller;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lightweight live Gotenberg check — skipped when Docker/Gotenberg is down.
 */
class GotenbergLiveConvertIT {

    private static final Path EVIDENCE = Path.of("c:/Users/engrm/OneDrive/Desktop/Group7/_gotenberg_verify_evidence");

    @Test
    void convertRirekishoAndEnglishWhenGotenbergUp() throws Exception {
        Assumptions.assumeTrue(isHealthy(), "Gotenberg not running on localhost:3000 — skip live PDF IT");

        Files.createDirectories(EVIDENCE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("furigana", "やまだ たろう");
        payload.put("nameJa", "山田 太郎");
        payload.put("dateOfBirth", LocalDate.of(2003, 4, 1));
        payload.put("nationality", "日本");
        payload.put("addressText", "東京都渋谷区1-1");
        payload.put("email", "taro@example.com");
        payload.put("phone", "090-1111-2222");
        payload.put("education", List.of(Map.of("detail", "TRON専門学校 情報システム科 卒業")));
        payload.put("workExperience", List.of(Map.of("detail", "TRON Lab インターン")));
        payload.put("selfPr", "Spring Boot と React で学習中です。");
        payload.put("hobbies", "読書");
        payload.put("certifications", List.of(Map.of("name", "基本情報技術者")));

        RirekishoExcelFiller filler = new RirekishoExcelFiller();
        byte[] xlsx = filler.fill(payload);
        Path xlsxPath = EVIDENCE.resolve("sample_rirekisho.xlsx");
        Files.write(xlsxPath, xlsx);
        assertThat(xlsx.length).isGreaterThan(5_000);

        GotenbergProperties props = new GotenbergProperties();
        GotenbergPdfClient client = new GotenbergPdfClient(props);
        byte[] pdf = client.convertLibreOffice(xlsx, "sample_rirekisho.xlsx");
        Files.write(EVIDENCE.resolve("sample_rirekisho.pdf"), pdf);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");

        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(2);
            PDFRenderer renderer = new PDFRenderer(doc);
            for (int i = 0; i < Math.min(2, doc.getNumberOfPages()); i++) {
                BufferedImage img = renderer.renderImageWithDPI(i, 120);
                ImageIO.write(img, "png", EVIDENCE.resolve("rirekisho_page_" + (i + 1) + ".png").toFile());
            }
        }

        AlternateCvWorkbookExporter alt = new AlternateCvWorkbookExporter();
        Map<String, Object> en = new HashMap<>();
        en.put("fullName", "Taro Yamada");
        en.put("email", "taro@example.com");
        en.put("phone", "090-1111-2222");
        en.put("addressText", "Tokyo");
        en.put("selfPr", "Learning full-stack development.");
        en.put("education", List.of(Map.of("detail", "TRON College — Information Systems")));
        en.put("workExperience", List.of(Map.of("detail", "Intern — TRON Lab")));
        en.put("skills", List.of("Java", "Spring Boot", "React"));
        byte[] enXlsx = alt.exportEnglishResume(en);
        Files.write(EVIDENCE.resolve("sample_resume_en.xlsx"), enXlsx);
        byte[] enPdf = client.convertLibreOffice(enXlsx, "sample_resume_en.xlsx");
        Files.write(EVIDENCE.resolve("sample_resume_en.pdf"), enPdf);
        try (PDDocument doc = Loader.loadPDF(enPdf)) {
            assertThat(doc.getNumberOfPages()).isGreaterThanOrEqualTo(1);
            BufferedImage img = new PDFRenderer(doc).renderImageWithDPI(0, 120);
            ImageIO.write(img, "png", EVIDENCE.resolve("resume_en_page_1.png").toFile());
        }
    }

    private static boolean isHealthy() {
        try {
            HttpURLConnection c = (HttpURLConnection) URI.create("http://127.0.0.1:3000/health").toURL().openConnection();
            c.setConnectTimeout(2000);
            c.setReadTimeout(2000);
            c.setRequestMethod("GET");
            int code = c.getResponseCode();
            c.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        }
    }
}
