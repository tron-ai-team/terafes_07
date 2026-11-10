package com.tronai.career.cvbuilder;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CvHtmlPdfGotenbergIT {

    @Test
    void renderProfessionalRirekishoWithAndWithoutPhoto() throws Exception {
        Assumptions.assumeTrue(gotenbergUp(), "Gotenberg not available");

        CvHtmlPdfRenderer renderer = new CvHtmlPdfRenderer();
        Path outDir = Path.of(System.getProperty("user.dir"))
                .resolve("../../evidence/cp03d").normalize().toAbsolutePath();
        // Maven surefire cwd is module root (backend-spring)
        if (!Files.isDirectory(outDir.getParent())) {
            outDir = Path.of("target", "cp03d-pdf-evidence").toAbsolutePath();
        }
        Files.createDirectories(outDir);
        System.out.println("CP03D evidence dir=" + outDir);

        Map<String, Object> ja = sampleJa();
        byte[] photoJpeg = solidJpeg(300, 400);
        String photoUri = CvPhotoSupport.toDataUri(photoJpeg, "image/jpeg");

        byte[] withPhoto = convertHtml(renderer.renderHtml("RIREKISHO_JA", ja, photoUri));
        byte[] noPhoto = convertHtml(renderer.renderHtml("RIREKISHO_JA", ja, null));
        byte[] en = convertHtml(renderer.renderHtml("RESUME_EN", sampleEn(), null));

        assertTrue(withPhoto.length > 1000);
        assertTrue(noPhoto.length > 1000);
        assertTrue(en.length > 500);
        assertEquals('%', (char) withPhoto[0]);
        assertEquals('P', (char) withPhoto[1]);

        Files.write(outDir.resolve("rirekisho_with_photo.pdf"), withPhoto);
        Files.write(outDir.resolve("rirekisho_no_photo.pdf"), noPhoto);
        Files.write(outDir.resolve("resume_en.pdf"), en);
        Files.write(outDir.resolve("rirekisho_with_photo.html"), renderer.renderHtml("RIREKISHO_JA", ja, photoUri));
        Files.write(outDir.resolve("test_photo.jpg"), photoJpeg);

        // Page count via simple PDF trailer scan is unreliable; size + header is enough here.
        // Visual rasterization is done by evidence/cp03d/inspect_pdfs.py
        assertTrue(new String(withPhoto, StandardCharsets.ISO_8859_1).startsWith("%PDF"));
    }

    private static Map<String, Object> sampleJa() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("nameJa", "山田　太郎");
        p.put("furigana", "やまだ　たろう");
        p.put("dateOfBirth", "1998-04-15");
        p.put("postalCode", "150-0001");
        p.put("addressText", "東京都渋谷区神宮前1-2-3");
        p.put("phone", "090-1234-5678");
        p.put("email", "taro@example.com");
        p.put("selfPr", "大学でJavaとSpring Bootを学び、チーム開発で丁寧なコミュニケーションを心がけています。".repeat(3));
        p.put("careerGoals", "貴社のエンジニア職に貢献したいと考えています。");
        p.put("education", List.of(
                Map.of("schoolName", "東京テクニカルカレッジ", "detail", "情報処理科",
                        "startYear", 2025, "startMonth", 4, "endYear", 2027, "endMonth", 3, "status", "卒業見込み"),
                Map.of("schoolName", "東京都立高校", "endYear", 2025, "endMonth", 3, "status", "卒業")
        ));
        p.put("workExperience", List.of());
        p.put("certifications", List.of(
                Map.of("name", "普通自動車第一種運転免許", "year", 2024, "month", 8),
                Map.of("name", "基本情報技術者試験", "year", 2025, "month", 4)
        ));
        p.put("hobbies", "読書・ウォーキング");
        return p;
    }

    private static Map<String, Object> sampleEn() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("fullName", "Taro Yamada");
        p.put("email", "taro@example.com");
        p.put("phone", "+81-90-1234-5678");
        p.put("addressText", "Tokyo, Japan");
        p.put("selfPr", "Software engineering student focused on Spring Boot and cloud systems.");
        p.put("skills", List.of(Map.of("name", "Java"), Map.of("name", "Spring Boot"), Map.of("name", "MySQL")));
        p.put("education", List.of(Map.of("schoolName", "Tokyo Technical College", "endYear", 2027, "endMonth", 3, "status", "Expected graduation")));
        p.put("projects", List.of(Map.of("name", "TRON AI", "description", "Career platform with CV Builder")));
        p.put("workExperience", List.of());
        p.put("certifications", List.of());
        return p;
    }

    private static byte[] solidJpeg(int w, int h) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(70, 110, 160));
        g.fillRect(0, 0, w, h);
        g.setColor(new Color(240, 220, 200));
        g.fillOval(w / 4, h / 10, w / 2, h / 3);
        g.setColor(new Color(50, 50, 80));
        g.fillRoundRect(w / 5, h / 2, (int) (w * 0.6), h / 2, 40, 40);
        g.dispose();
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpeg", bos);
        return bos.toByteArray();
    }

    private static boolean gotenbergUp() {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
            HttpResponse<String> res = client.send(
                    HttpRequest.newBuilder(URI.create("http://localhost:3000/health")).GET().timeout(Duration.ofSeconds(2)).build(),
                    HttpResponse.BodyHandlers.ofString());
            return res.statusCode() == 200 && res.body() != null && res.body().contains("up");
        } catch (Exception e) {
            return false;
        }
    }

    private static byte[] convertHtml(byte[] html) throws Exception {
        String boundary = "----cp03d" + System.nanoTime();
        byte[] preamble = ("--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"files\"; filename=\"index.html\"\r\n"
                + "Content-Type: text/html\r\n\r\n").getBytes(StandardCharsets.UTF_8);
        byte[] epilogue = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);
        byte[] body = new byte[preamble.length + html.length + epilogue.length];
        System.arraycopy(preamble, 0, body, 0, preamble.length);
        System.arraycopy(html, 0, body, preamble.length, html.length);
        System.arraycopy(epilogue, 0, body, preamble.length + html.length, epilogue.length);

        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        HttpResponse<byte[]> res = client.send(
                HttpRequest.newBuilder(URI.create("http://localhost:3000/forms/chromium/convert/html"))
                        .timeout(Duration.ofSeconds(90))
                        .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                        .build(),
                HttpResponse.BodyHandlers.ofByteArray());
        assertEquals(200, res.statusCode(), "Gotenberg HTML convert failed");
        return res.body();
    }
}
