package com.tronai.career.cvbuilder;

import org.apache.fontbox.ttf.TrueTypeCollection;
import org.apache.fontbox.ttf.TrueTypeFont;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Generates a real multi-page PDF of CV payload with Japanese font support.
 * Keeps TrueTypeCollection open until after {@link PDDocument#save}.
 */
@Component
public class CvPdfExporter {

    public byte[] export(Map<String, Object> payload, String templateCode) throws Exception {
        try (PDDocument doc = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream();
             FontHandle fontHandle = openJapaneseFont(doc)) {

            PDType0Font font = fontHandle.font();
            PDPage page1 = new PDPage(PDRectangle.A4);
            PDPage page2 = new PDPage(PDRectangle.A4);
            doc.addPage(page1);
            doc.addPage(page2);

            List<String> lines1 = new ArrayList<>();
            lines1.add("履歴書 / Resume — " + templateCode);
            lines1.add("氏名: " + val(payload, "nameJa", "fullName"));
            lines1.add("ふりがな: " + val(payload, "furigana"));
            lines1.add("生年月日: " + val(payload, "dateOfBirth"));
            lines1.add("国籍: " + val(payload, "nationality"));
            lines1.add("住所: " + val(payload, "addressText"));
            lines1.add("E-mail: " + val(payload, "email"));
            lines1.add("電話: " + val(payload, "phone"));
            lines1.add("--- 学歴 ---");
            appendList(lines1, payload.get("education"));
            lines1.add("--- 職歴 ---");
            appendList(lines1, payload.get("workExperience"));
            writePage(doc, page1, font, lines1);

            List<String> lines2 = new ArrayList<>();
            lines2.add("自己PR");
            lines2.add(val(payload, "selfPr"));
            lines2.add("--- 免許・資格 ---");
            appendList(lines2, payload.get("certifications"));
            lines2.add("得意科目: " + val(payload, "favoriteSubjects"));
            lines2.add("趣味・特技: " + val(payload, "hobbies"));
            lines2.add("健康状態: " + val(payload, "healthStatus"));
            lines2.add("課外活動: " + val(payload, "extracurricular"));
            lines2.add("スポーツ: " + val(payload, "sports"));
            writePage(doc, page2, font, lines2);

            doc.save(out);
            return out.toByteArray();
        }
    }

    private FontHandle openJapaneseFont(PDDocument doc) throws Exception {
        String[] ttcPaths = {
                "C:/Windows/Fonts/msgothic.ttc",
                "C:/Windows/Fonts/msmincho.ttc",
                "C:/Windows/Fonts/meiryo.ttc",
                "C:/Windows/Fonts/YuGothM.ttc",
                "C:/Windows/Fonts/yugothic.ttc"
        };
        Exception last = null;
        for (String path : ttcPaths) {
            File file = new File(path);
            if (!file.isFile()) continue;
            TrueTypeCollection collection = null;
            try {
                collection = new TrueTypeCollection(file);
                AtomicReference<TrueTypeFont> first = new AtomicReference<>();
                collection.processAllFonts(ttf -> {
                    if (first.get() == null) first.set(ttf);
                });
                TrueTypeFont ttf = first.get();
                if (ttf == null) {
                    collection.close();
                    continue;
                }
                PDType0Font font = PDType0Font.load(doc, ttf, true);
                return new FontHandle(font, collection);
            } catch (Exception e) {
                last = e;
                if (collection != null) {
                    try { collection.close(); } catch (Exception ignored) {}
                }
            }
        }
        throw new IllegalStateException(
                "No Japanese-capable font found for PDF export (install MS Gothic/Meiryo)", last);
    }

    private void writePage(PDDocument doc, PDPage page, PDType0Font font, List<String> lines) throws Exception {
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            float y = page.getMediaBox().getHeight() - 50;
            cs.beginText();
            cs.setFont(font, 11);
            cs.newLineAtOffset(40, y);
            for (String line : lines) {
                String safe = line == null ? "" : line.replace("\r", " ").replace("\n", " ");
                if (safe.length() > 80) safe = safe.substring(0, 80);
                safe = safe.replaceAll("[\\p{Cntrl}&&[^\t]]", " ");
                cs.showText(safe.isEmpty() ? " " : safe);
                cs.newLineAtOffset(0, -16);
            }
            cs.endText();
        }
    }

    private String val(Map<String, Object> payload, String... keys) {
        for (String k : keys) {
            Object v = payload.get(k);
            if (v != null && !String.valueOf(v).isBlank()) return String.valueOf(v);
        }
        return "";
    }

    private void appendList(List<String> lines, Object obj) {
        if (!(obj instanceof List<?> list) || list.isEmpty()) {
            lines.add("(なし)");
            return;
        }
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                Object line = m.get("detail");
                if (line == null) line = m.get("school");
                if (line == null) line = m.get("name");
                if (line == null) line = m.get("organization");
                if (line == null) line = item;
                lines.add(String.valueOf(line));
            } else {
                lines.add(String.valueOf(item));
            }
        }
    }

    private record FontHandle(PDType0Font font, Closeable resource) implements Closeable {
        @Override
        public void close() {
            try {
                if (resource != null) resource.close();
            } catch (Exception ignored) {
            }
        }
    }
}
