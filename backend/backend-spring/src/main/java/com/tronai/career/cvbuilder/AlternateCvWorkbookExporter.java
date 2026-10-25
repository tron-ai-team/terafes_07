package com.tronai.career.cvbuilder;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;

/**
 * Separate workbooks for 職務経歴書 and English Resume — not disguised 履歴書 masters.
 */
@Component
public class AlternateCvWorkbookExporter {

    public byte[] exportShokumuKeirekisho(Map<String, Object> payload) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("職務経歴書");
            int r = 0;
            r = writeLine(sheet, r, "職務経歴書");
            r = writeLine(sheet, r, "氏名", str(payload.get("nameJa"), payload.get("fullName")));
            r = writeLine(sheet, r, "連絡先", str(payload.get("email")) + " / " + str(payload.get("phone")));
            r = writeLine(sheet, r, "キャリア概要", str(payload.get("careerSummary"), payload.get("selfPr")));
            r = writeLine(sheet, r, "— 職歴 —");
            r = writeList(sheet, r, payload.get("workExperience"));
            r = writeLine(sheet, r, "— スキル —");
            r = writeList(sheet, r, payload.get("skills"));
            r = writeLine(sheet, r, "— プロジェクト —");
            r = writeList(sheet, r, payload.get("projects"));
            r = writeLine(sheet, r, "— 資格 —");
            r = writeList(sheet, r, payload.get("certifications"));
            r = writeLine(sheet, r, "自己PR", str(payload.get("selfPr")));
            sheet.setColumnWidth(0, 5000);
            sheet.setColumnWidth(1, 14000);
            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportEnglishResume(Map<String, Object> payload) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Resume");
            int r = 0;
            r = writeLine(sheet, r, "Resume");
            r = writeLine(sheet, r, "Name", str(payload.get("fullName"), payload.get("nameJa")));
            r = writeLine(sheet, r, "Email", str(payload.get("email")));
            r = writeLine(sheet, r, "Phone", str(payload.get("phone")));
            r = writeLine(sheet, r, "Address", str(payload.get("addressText")));
            r = writeLine(sheet, r, "Professional Summary", str(payload.get("careerSummary"), payload.get("selfPr")));
            r = writeLine(sheet, r, "— Education —");
            r = writeList(sheet, r, payload.get("education"));
            r = writeLine(sheet, r, "— Experience —");
            r = writeList(sheet, r, payload.get("workExperience"));
            r = writeLine(sheet, r, "— Skills —");
            r = writeList(sheet, r, payload.get("skills"));
            r = writeLine(sheet, r, "— Projects —");
            r = writeList(sheet, r, payload.get("projects"));
            r = writeLine(sheet, r, "— Certifications —");
            r = writeList(sheet, r, payload.get("certifications"));
            sheet.setColumnWidth(0, 6000);
            sheet.setColumnWidth(1, 14000);
            wb.write(out);
            return out.toByteArray();
        }
    }

    private int writeLine(Sheet sheet, int rowIdx, String label) {
        Row row = sheet.createRow(rowIdx);
        row.createCell(0).setCellValue(label);
        return rowIdx + 1;
    }

    private int writeLine(Sheet sheet, int rowIdx, String label, String value) {
        Row row = sheet.createRow(rowIdx);
        row.createCell(0).setCellValue(label);
        row.createCell(1).setCellValue(value == null ? "" : value);
        return rowIdx + 1;
    }

    @SuppressWarnings("unchecked")
    private int writeList(Sheet sheet, int rowIdx, Object raw) {
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    Object detail = map.get("detail");
                    if (detail == null) detail = map.get("title");
                    if (detail == null) detail = map.get("school");
                    if (detail == null) detail = map.get("organization");
                    if (detail == null) detail = map.toString();
                    rowIdx = writeLine(sheet, rowIdx, "", String.valueOf(detail));
                } else {
                    rowIdx = writeLine(sheet, rowIdx, "", String.valueOf(item));
                }
            }
        } else if (raw != null) {
            rowIdx = writeLine(sheet, rowIdx, "", String.valueOf(raw));
        }
        return rowIdx;
    }

    private static String str(Object... vals) {
        for (Object v : vals) {
            if (v != null && !String.valueOf(v).isBlank() && !"null".equals(String.valueOf(v))) {
                return String.valueOf(v);
            }
        }
        return "";
    }
}
