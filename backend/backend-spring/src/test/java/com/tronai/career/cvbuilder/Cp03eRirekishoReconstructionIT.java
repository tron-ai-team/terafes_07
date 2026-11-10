package com.tronai.career.cvbuilder;

import com.tronai.career.cvbuilder.gotenberg.GotenbergPdfClient;
import com.tronai.career.cvbuilder.gotenberg.GotenbergProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
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
 * CP-03E: fill owner master XLSX, convert via LibreOffice, rasterize for visual QA.
 */
class Cp03eRirekishoReconstructionIT {

    private static final Path EVIDENCE = Path.of("c:/Users/engrm/OneDrive/Desktop/Group7/evidence/cp03e");

    @Test
    void generateFilledPdfAndCompareGeometry() throws Exception {
        Assumptions.assumeTrue(gotenbergUp(), "Gotenberg not on :3000");
        Files.createDirectories(EVIDENCE);

        Map<String, Object> payload = samplePayload();
        byte[] photo = syntheticIdPhoto();
        RirekishoExcelFiller filler = new RirekishoExcelFiller();
        byte[] xlsx = filler.fill(payload, photo);
        Files.write(EVIDENCE.resolve("cp03e_filled.xlsx"), xlsx);

        try (Workbook wb = WorkbookFactory.create(new java.io.ByteArrayInputStream(xlsx))) {
            Sheet s1 = wb.getSheet(RirekishoExcelFiller.SHEET1);
            assertThat(s1.getRow(2).getCell(2).getStringCellValue()).contains("山田");
            assertThat(s1.getRow(14).getCell(3).getStringCellValue()).contains("入学");
            assertThat(s1.getRow(15).getCell(3).getStringCellValue()).contains("卒業");
            assertThat(s1.getRow(24).getCell(3).getStringCellValue()).contains("な");
            assertThat(wb.getAllPictures()).isNotEmpty();
        }

        GotenbergPdfClient client = new GotenbergPdfClient(new GotenbergProperties());
        byte[] pdf = client.convertLibreOffice(xlsx, "cp03e_filled.xlsx");
        Files.write(EVIDENCE.resolve("cp03e_filled.pdf"), pdf);
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");

        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isEqualTo(2);
            PDFRenderer renderer = new PDFRenderer(doc);
            for (int i = 0; i < 2; i++) {
                BufferedImage img = renderer.renderImageWithDPI(i, 200);
                ImageIO.write(img, "png", EVIDENCE.resolve("cp03e_p" + (i + 1) + ".png").toFile());
            }
        }

        // Side-by-side structural collage vs owner reference pages (geometry, not text).
        for (int page = 1; page <= 2; page++) {
            Path ref = EVIDENCE.resolve("reference_p" + page + ".png");
            Path gen = EVIDENCE.resolve("cp03e_p" + page + ".png");
            Path cp03d = EVIDENCE.resolve("cp03d_p" + page + ".png");
            if (Files.exists(ref) && Files.exists(gen)) {
                BufferedImage a = ImageIO.read(ref.toFile());
                BufferedImage b = ImageIO.read(gen.toFile());
                BufferedImage side = sideBySide(scale(a, 800), scale(b, 800));
                ImageIO.write(side, "png", EVIDENCE.resolve("compare_ref_vs_cp03e_p" + page + ".png").toFile());
                if (Files.exists(cp03d)) {
                    BufferedImage c = ImageIO.read(cp03d.toFile());
                    BufferedImage triple = sideBySide(scale(c, 550), scale(b, 550));
                    ImageIO.write(triple, "png", EVIDENCE.resolve("compare_cp03d_vs_cp03e_p" + page + ".png").toFile());
                }
            }
        }
    }

    @Test
    void longNameAndNoPhotoStillFits() throws Exception {
        RirekishoExcelFiller filler = new RirekishoExcelFiller();
        Map<String, Object> payload = samplePayload();
        payload.put("nameJa", "アレクサンダー・フォン・ホンブルク＝シュミッツ");
        payload.put("furigana", "あれくさんだー・ふぉん・ほんぶるぐ＝しゅみっつ");
        payload.put("addressText", "東京都千代田区丸の内一丁目9番1号　グラントウキョウサウスタワー42階");
        payload.put("postalCode", "100-0005");
        payload.put("education", List.of(
                Map.of("schoolName", "○○高等学校", "startYear", 2016, "startMonth", 4,
                        "endYear", 2019, "endMonth", 3, "status", "卒業"),
                Map.of("schoolName", "△△大学 工学部 情報工学科", "startYear", 2019, "startMonth", 4,
                        "endYear", 2023, "endMonth", 3, "status", "卒業"),
                Map.of("schoolName", "△△大学大学院 工学研究科", "startYear", 2023, "startMonth", 4,
                        "endYear", 2025, "endMonth", 3, "status", "卒業見込み")
        ));
        payload.put("workExperience", List.of());
        payload.put("certifications", List.of(
                Map.of("name", "普通自動車第一種運転免許", "year", 2020, "month", 8),
                Map.of("name", "基本情報技術者", "year", 2022, "month", 4)
        ));
        payload.put("personalRequests", "勤務地は関東圏を希望します。");
        byte[] xlsx = filler.fill(payload, null);
        Files.createDirectories(EVIDENCE);
        Files.write(EVIDENCE.resolve("cp03e_longname.xlsx"), xlsx);
        try (Workbook wb = WorkbookFactory.create(new java.io.ByteArrayInputStream(xlsx))) {
            Sheet s1 = wb.getSheet(RirekishoExcelFiller.SHEET1);
            assertThat(s1.getRow(2).getCell(2).getStringCellValue()).contains("アレクサンダー");
            // 3 schools × 2 lines = 6 education rows
            assertThat(s1.getRow(14).getCell(1).getStringCellValue()).isEqualTo("2016");
            assertThat(s1.getRow(19).getCell(3).getStringCellValue()).contains("卒業見込み");
            assertThat(s1.getRow(24).getCell(3).getStringCellValue()).contains("な");
        }
    }

    private static Map<String, Object> samplePayload() {
        Map<String, Object> payload = new HashMap<>();
        payload.put("furigana", "やまだ たろう");
        payload.put("nameJa", "山田 太郎");
        payload.put("dateOfBirth", LocalDate.of(2002, 5, 15));
        payload.put("nationality", "日本");
        payload.put("addressText", "東京都新宿区西新宿2-8-1");
        payload.put("postalCode", "160-0023");
        payload.put("email", "taro.yamada@example.com");
        payload.put("phone", "090-1234-5678");
        payload.put("education", List.of(
                Map.of("schoolName", "○○高等学校", "startYear", 2018, "startMonth", 4,
                        "endYear", 2021, "endMonth", 3, "status", "卒業"),
                Map.of("schoolName", "△△大学 情報学部", "startYear", 2021, "startMonth", 4,
                        "endYear", 2025, "endMonth", 3, "status", "卒業見込み")
        ));
        payload.put("workExperience", List.of());
        payload.put("selfPr", "チーム開発と継続学習を大切にしています。");
        payload.put("motivationGeneral", "貴社の技術力と成長環境に魅力を感じ志望しました。");
        payload.put("certifications", List.of(Map.of("name", "普通自動車第一種運転免許", "year", 2021, "month", 6)));
        payload.put("hobbies", "読書");
        return payload;
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
