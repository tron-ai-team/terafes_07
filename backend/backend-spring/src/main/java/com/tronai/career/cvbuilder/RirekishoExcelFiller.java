package com.tronai.career.cvbuilder;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.chrono.JapaneseChronology;
import java.time.chrono.JapaneseDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Fills the immutable Japanese 履歴書 master workbook without altering fonts/merges.
 * Sheet names: {@code 1面} and {@code 2面 } (trailing space on page 2).
 */
@Component
public class RirekishoExcelFiller {

    public static final String MASTER_CLASSPATH = "career/templates/rirekisho_master.xlsx";
    public static final String SHEET1 = "1面";
    public static final String SHEET2 = "2面 ";

    /** Education rows D15..D23 inclusive (0-based 14..22). */
    public static final int MAX_EDUCATION_ROWS = 9;
    /** Work rows D25..D28 inclusive (0-based 24..27). */
    public static final int MAX_WORK_ROWS = 4;
    /** License rows on sheet 2 (0-based 13..18). */
    public static final int MAX_CERT_ROWS = 6;

    private static final DateTimeFormatter WAREKI =
            DateTimeFormatter.ofPattern("Gy年M月d日", Locale.JAPAN).withChronology(JapaneseChronology.INSTANCE);

    public byte[] fill(Map<String, Object> payload) throws Exception {
        ClassPathResource resource = new ClassPathResource(MASTER_CLASSPATH);
        try (InputStream in = resource.getInputStream();
             XSSFWorkbook wb = new XSSFWorkbook(in);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet s1 = wb.getSheet(SHEET1);
            Sheet s2 = wb.getSheet(SHEET2);
            if (s1 == null || s2 == null) {
                throw new IllegalStateException("Master workbook missing sheets 1面 / '2面 '");
            }

            // Capacity is also enforced in CvBuilderService before export; fail hard here too.
            assertCapacity(payload);

            LocalDate today = LocalDate.now();
            JapaneseDate jdToday = JapaneseDate.from(today);
            setCell(s1, 0, 8, eraLabel(jdToday)); // I1 令和/etc
            setCell(s1, 0, 9, String.valueOf(eraYear(jdToday)));
            setCell(s1, 0, 11, String.valueOf(today.getMonthValue()));
            setCell(s1, 0, 13, String.valueOf(today.getDayOfMonth()));

            String furigana = str(payload.get("furigana"));
            String name = firstNonBlank(str(payload.get("nameJa")), str(payload.get("fullName")));
            setCell(s1, 1, 2, furigana); // C2 under ふりがな label B2
            setCell(s1, 2, 2, name); // C3 氏名 area (merged C3:N3)

            LocalDate dob = parseDate(payload.get("dateOfBirth"));
            if (dob != null) {
                JapaneseDate jd = JapaneseDate.from(dob);
                setCell(s1, 3, 2, eraLabel(jd)); // C4
                setCell(s1, 3, 3, String.valueOf(eraYear(jd))); // D4 near 年
                setCell(s1, 3, 5, String.valueOf(dob.getMonthValue()));
                setCell(s1, 3, 7, String.valueOf(dob.getDayOfMonth()));
                int age = today.getYear() - dob.getYear()
                        - (today.getDayOfYear() < dob.getDayOfYear() ? 1 : 0);
                setCell(s1, 4, 7, String.valueOf(age)); // near 歳
            }
            setCell(s1, 3, 11, str(payload.get("nationality"))); // L4 merge area

            setCell(s1, 5, 2, str(payload.get("addressFurigana")));
            setCell(s1, 6, 5, str(payload.get("postalCode")));
            setCell(s1, 6, 2, str(payload.get("addressText"))); // C7 area
            setCell(s1, 8, 2, str(payload.get("email")));
            setCell(s1, 8, 11, str(payload.get("phone"))); // L9 cellphone

            // Education rows D15.. (labels D14=学歴). Write into D15+
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> education = (List<Map<String, Object>>) payload.get("education");
            int eduRow = 14; // 0-based row 14 = Excel row 15
            if (education != null) {
                for (Map<String, Object> e : education) {
                    String line = firstNonBlank(str(e.get("detail")),
                            str(e.get("school")) + " " + str(e.get("period")));
                    setCell(s1, eduRow++, 3, line.trim());
                }
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> work = (List<Map<String, Object>>) payload.get("workExperience");
            int workRow = 24; // after 職歴 label at D24
            if (work == null || work.isEmpty()) {
                setCell(s1, 24, 3, "な　し");
            } else {
                setCell(s1, 24, 3, "");
                for (Map<String, Object> w : work) {
                    String line = firstNonBlank(str(w.get("detail")),
                            str(w.get("organization")) + " " + str(w.get("role")) + " " + str(w.get("period")));
                    setCell(s1, workRow++, 3, line.trim());
                }
            }

            // Sheet 2 — do not alter fonts; values only (※設定済みのフォントサイズは変更しないこと。)
            setCell(s2, 6, 2, str(payload.get("selfPr"))); // C7:G12 自己PR
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> certs = (List<Map<String, Object>>) payload.get("certifications");
            int certRow = 13;
            if (certs != null) {
                for (Map<String, Object> c : certs) {
                    setCell(s2, certRow, 4, str(c.get("name")));
                    certRow++;
                }
            }
            setCell(s2, 19, 2, str(payload.get("favoriteSubjects"))); // 得意科目
            setCell(s2, 19, 5, str(payload.get("hobbies")));
            setCell(s2, 21, 2, str(payload.get("healthStatus")));
            setCell(s2, 23, 2, str(payload.get("extracurricular")));
            setCell(s2, 23, 5, str(payload.get("sports")));

            wb.write(out);
            return out.toByteArray();
        }
    }

    @SuppressWarnings("unchecked")
    private static void assertCapacity(Map<String, Object> payload) {
        List<?> education = payload.get("education") instanceof List<?> l ? l : List.of();
        List<?> work = payload.get("workExperience") instanceof List<?> l ? l : List.of();
        List<?> certs = payload.get("certifications") instanceof List<?> l ? l : List.of();
        if (education.size() > MAX_EDUCATION_ROWS) {
            throw new IllegalArgumentException(
                    "Education entries (" + education.size() + ") exceed template capacity (" + MAX_EDUCATION_ROWS + ")");
        }
        if (work.size() > MAX_WORK_ROWS) {
            throw new IllegalArgumentException(
                    "Work entries (" + work.size() + ") exceed template capacity (" + MAX_WORK_ROWS + ")");
        }
        if (certs.size() > MAX_CERT_ROWS) {
            throw new IllegalArgumentException(
                    "Certification entries (" + certs.size() + ") exceed template capacity (" + MAX_CERT_ROWS + ")");
        }
    }

    private static void setCell(Sheet sheet, int rowIdx, int colIdx, String value) {
        if (value == null) return;
        Row row = sheet.getRow(rowIdx);
        if (row == null) row = sheet.createRow(rowIdx);
        Cell cell = row.getCell(colIdx);
        if (cell == null) cell = row.createCell(colIdx);
        // Values only — never mutate font/size/style (master instruction).
        cell.setCellValue(value);
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static String firstNonBlank(String a, String b) {
        return (a != null && !a.isBlank()) ? a : (b == null ? "" : b);
    }

    private static LocalDate parseDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate d) return d;
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        try {
            return LocalDate.parse(s.substring(0, Math.min(10, s.length())));
        } catch (Exception e) {
            return null;
        }
    }

    private static String eraLabel(JapaneseDate jd) {
        String formatted = WAREKI.format(jd);
        // e.g. 令和6年… → 令和
        int idx = 0;
        while (idx < formatted.length() && !Character.isDigit(formatted.charAt(idx))) idx++;
        return formatted.substring(0, idx);
    }

    private static int eraYear(JapaneseDate jd) {
        return jd.get(java.time.temporal.ChronoField.YEAR_OF_ERA);
    }
}
