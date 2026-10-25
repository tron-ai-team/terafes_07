package com.tronai.career.cvbuilder;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

/** POI-built workbooks for 職務経歴書 and English resume (not rirekisho master). */
@Component
public class CvWorkbookExporter {

    public byte[] exportShokumu(Map<String, Object> payload) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("職務経歴書");
            int row = 0;
            row = titleRow(sheet, row, "職務経歴書");
            row = textBlock(sheet, row, "概要", str(payload.get("summary")));
            row = workBlock(sheet, row, payload);
            row = textBlock(sheet, row, "スキル", joinList(payload.get("skills")));
            textBlock(sheet, row, "自己PR", str(payload.get("selfPr")));
            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportResumeEn(Map<String, Object> payload) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Resume");
            int row = 0;
            row = titleRow(sheet, row, str(payload.get("fullName")));
            row = textBlock(sheet, row, "Contact", str(payload.get("contact")));
            row = textBlock(sheet, row, "Summary", str(payload.get("summary")));
            row = workBlock(sheet, row, payload);
            row = textBlock(sheet, row, "Education", formatEducation(payload.get("education")));
            textBlock(sheet, row, "Skills", joinList(payload.get("skills")));
            wb.write(out);
            return out.toByteArray();
        }
    }

    private int workBlock(Sheet sheet, int row, Map<String, Object> payload) {
        row = labelRow(sheet, row, "Experience");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> work = (List<Map<String, Object>>) payload.get("workExperience");
        if (work == null) work = (List<Map<String, Object>>) payload.get("experience");
        if (work == null || work.isEmpty()) {
            return textRow(sheet, row, "(none)");
        }
        for (Map<String, Object> w : work) {
            String line = String.join(" | ",
                    str(w.get("organization")),
                    str(w.get("role")),
                    str(w.get("period")),
                    str(w.get("detail")));
            row = textRow(sheet, row, line);
        }
        return row + 1;
    }

    private int titleRow(Sheet sheet, int row, String title) {
        Row r = sheet.createRow(row++);
        r.createCell(0).setCellValue(title);
        return row;
    }

    private int labelRow(Sheet sheet, int row, String label) {
        Row r = sheet.createRow(row++);
        Cell c = r.createCell(0);
        c.setCellValue(label);
        return row;
    }

    private int textBlock(Sheet sheet, int row, String label, String text) {
        row = labelRow(sheet, row, label);
        return textRow(sheet, row, text);
    }

    private int textRow(Sheet sheet, int row, String text) {
        Row r = sheet.createRow(row++);
        r.createCell(0).setCellValue(text == null ? "" : text);
        return row;
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private String joinList(Object o) {
        if (!(o instanceof List<?> list)) return "";
        return list.stream().map(String::valueOf).reduce((a, b) -> a + ", " + b).orElse("");
    }

    private String formatEducation(Object o) {
        if (!(o instanceof List<?> list)) return "";
        StringBuilder sb = new StringBuilder();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                sb.append(m.get("school")).append(" ").append(m.get("period")).append('\n');
            }
        }
        return sb.toString().trim();
    }
}
