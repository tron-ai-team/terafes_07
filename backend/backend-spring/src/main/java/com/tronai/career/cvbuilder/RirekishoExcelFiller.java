package com.tronai.career.cvbuilder;

import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.chrono.JapaneseChronology;
import java.time.chrono.JapaneseDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Fills the Japanese 履歴書 master workbook (owner reference geometry) without
 * altering fonts/merges/borders. Optional photo is anchored in P1:T5 (約 3×4 cm).
 */
@Component
public class RirekishoExcelFiller {

    public static final String MASTER_CLASSPATH = "career/templates/rirekisho_master.xlsx";
    public static final String SHEET1 = "1面";
    public static final String SHEET2 = "2面 ";

    /** Education content rows D15..D23 inclusive (0-based 14..22). */
    public static final int MAX_EDUCATION_ROWS = 9;
    /**
     * Work content rows after 職歴 header (Excel 25–26). Rows 27–28 keep 賞罰 / 以上.
     * Owner student master only leaves two printable work lines before 賞罰.
     */
    public static final int MAX_WORK_ROWS = 2;
    /** License data rows on sheet 2 Excel 14–19 (0-based 13..18). */
    public static final int MAX_CERT_ROWS = 6;

    private static final DateTimeFormatter WAREKI =
            DateTimeFormatter.ofPattern("Gy年M月d日", Locale.JAPAN).withChronology(JapaneseChronology.INSTANCE);

    public byte[] fill(Map<String, Object> payload) throws Exception {
        return fill(payload, null);
    }

    public byte[] fill(Map<String, Object> payload, byte[] photoBytes) throws Exception {
        ClassPathResource resource = new ClassPathResource(MASTER_CLASSPATH);
        try (InputStream in = resource.getInputStream();
             XSSFWorkbook wb = new XSSFWorkbook(in);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet s1 = wb.getSheet(SHEET1);
            Sheet s2 = wb.getSheet(SHEET2);
            if (s1 == null || s2 == null) {
                throw new IllegalStateException("Master workbook missing sheets 1面 / '2面 '");
            }

            assertCapacity(payload);

            LocalDate today = LocalDate.now();
            JapaneseDate jdToday = JapaneseDate.from(today);
            setCell(s1, 0, 8, eraLabel(jdToday)); // I1
            setCell(s1, 0, 9, String.valueOf(eraYear(jdToday)));
            setCell(s1, 0, 11, String.valueOf(today.getMonthValue()));
            setCell(s1, 0, 13, String.valueOf(today.getDayOfMonth()));

            String furigana = str(payload.get("furigana"));
            String name = firstNonBlank(str(payload.get("nameJa")), str(payload.get("fullName")));
            setCell(s1, 1, 2, furigana); // C2
            setCell(s1, 2, 2, name); // C3

            LocalDate dob = parseDate(payload.get("dateOfBirth"));
            if (dob != null) {
                JapaneseDate jd = JapaneseDate.from(dob);
                setCell(s1, 3, 2, eraLabel(jd)); // C4
                setCell(s1, 3, 3, String.valueOf(eraYear(jd))); // D4
                setCell(s1, 3, 5, String.valueOf(dob.getMonthValue()));
                setCell(s1, 3, 7, String.valueOf(dob.getDayOfMonth()));
                int age = today.getYear() - dob.getYear()
                        - (today.getDayOfYear() < dob.getDayOfYear() ? 1 : 0);
                setCell(s1, 4, 7, String.valueOf(age)); // H5 near 歳
            }
            String nationality = str(payload.get("nationality"));
            if (!nationality.isBlank()) {
                setCell(s1, 3, 11, nationality); // L4
            }

            // Gender remains optional: do not overwrite the printed 男・女 circle area (O2:O3).

            setCell(s1, 5, 2, str(payload.get("addressFurigana"))); // C6 furigana of address
            String postal = str(payload.get("postalCode")).replace("〒", "").trim();
            String address = str(payload.get("addressText"));
            // F7:O7 is the printable address merge (C7 already shows 〒).
            String addressLine = joinNonBlank("　",
                    postal.isBlank() ? "" : postal,
                    address);
            if (!addressLine.isBlank()) {
                setCell(s1, 6, 5, addressLine); // F7
            }

            String email = str(payload.get("email"));
            String phone = str(payload.get("phone"));
            setCell(s1, 8, 2, email); // C9 E-mail
            if (!phone.isBlank()) {
                // Mobile → L9; otherwise home phone under 電話 (P7 area).
                if (looksMobile(phone)) {
                    setCell(s1, 8, 11, phone); // L9
                } else {
                    setCell(s1, 6, 15, phone); // P7
                }
            }

            // Education / work — chronological expanded lines into B/C/D columns.
            List<HistoryLine> eduLines = expandEducation(payload);
            int eduRow = 14; // Excel 15
            int eduWritten = 0;
            for (HistoryLine line : eduLines) {
                if (eduWritten >= MAX_EDUCATION_ROWS) break;
                if (line.year() != null) setCell(s1, eduRow, 1, String.valueOf(line.year()));
                if (line.month() != null) setCell(s1, eduRow, 2, String.valueOf(line.month()));
                if (!line.text().isBlank()) setCell(s1, eduRow, 3, line.text());
                eduRow++;
                eduWritten++;
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> work = (List<Map<String, Object>>) payload.get("workExperience");
            // Row 24 (Excel 25) starts work; keep 賞罰 @27 and 以上 @28.
            int workRow = 24; // Excel 25
            if (work == null || work.isEmpty()) {
                setCell(s1, 24, 1, "");
                setCell(s1, 24, 2, "");
                setCell(s1, 24, 3, "な　し");
                setCell(s1, 25, 3, "賞　罰");
                setCell(s1, 26, 3, "以　上");
            } else {
                int n = 0;
                for (Map<String, Object> w : work) {
                    if (n >= MAX_WORK_ROWS) break;
                    Integer year = firstYear(w);
                    Integer month = firstMonth(w);
                    String line = firstNonBlank(str(w.get("detail")),
                            joinNonBlank("　",
                                    str(w.get("organization")),
                                    str(w.get("company")),
                                    str(w.get("role")),
                                    str(w.get("jobTitle")),
                                    str(w.get("title"))));
                    if (year != null) setCell(s1, workRow, 1, String.valueOf(year));
                    if (month != null) setCell(s1, workRow, 2, String.valueOf(month));
                    if (!line.isBlank()) setCell(s1, workRow, 3, line);
                    workRow++;
                    n++;
                }
                // Pad unused work row then restore closing markers.
                while (workRow < 26) {
                    setCell(s1, workRow, 3, "");
                    workRow++;
                }
                setCell(s1, 26, 1, "");
                setCell(s1, 26, 2, "");
                setCell(s1, 26, 3, "賞　罰");
                setCell(s1, 27, 1, "");
                setCell(s1, 27, 2, "");
                setCell(s1, 27, 3, "以　上");
            }

            // Sheet 2 — owner master uses large 自己PR (C7:G12); no separate 本人希望欄.
            String selfPr = str(payload.get("selfPr"));
            String motivation = firstNonBlank(
                    str(payload.get("motivationCompany")),
                    str(payload.get("motivationGeneral")),
                    str(payload.get("careerGoals")));
            String personalHope = firstNonBlank(
                    str(payload.get("personalRequests")),
                    str(payload.get("employmentPreferences")),
                    str(payload.get("本人希望")));
            StringBuilder prBlock = new StringBuilder();
            if (!motivation.isBlank()) {
                prBlock.append("【志望動機】\n").append(motivation);
            }
            if (!selfPr.isBlank()) {
                if (!prBlock.isEmpty()) prBlock.append("\n\n");
                prBlock.append("【自己PR】\n").append(selfPr);
            }
            if (!personalHope.isBlank()) {
                if (!prBlock.isEmpty()) prBlock.append("\n\n");
                prBlock.append("【本人希望】\n").append(personalHope);
            }
            setCell(s2, 6, 2, prBlock.toString());

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> certs = (List<Map<String, Object>>) payload.get("certifications");
            int certRow = 13;
            if (certs != null) {
                int n = 0;
                for (Map<String, Object> c : certs) {
                    if (n++ >= MAX_CERT_ROWS) break;
                    Integer year = certYear(c);
                    Integer month = certMonth(c);
                    if (year != null) setCell(s2, certRow, 2, String.valueOf(year));
                    if (month != null) setCell(s2, certRow, 3, String.valueOf(month));
                    setCell(s2, certRow, 4, firstNonBlank(str(c.get("name")), str(c.get("title")), str(c.get("qualification"))));
                    certRow++;
                }
            }
            setCell(s2, 19, 2, str(payload.get("favoriteSubjects")));
            setCell(s2, 19, 5, str(payload.get("hobbies")));
            setCell(s2, 21, 2, str(payload.get("healthStatus")));
            setCell(s2, 23, 2, str(payload.get("extracurricular")));
            setCell(s2, 23, 5, str(payload.get("sports")));

            if (photoBytes != null && photoBytes.length > 50) {
                embedPhoto(wb, s1, photoBytes);
            }

            wb.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Anchor photo in merge P1:T5 (~3cm × 4cm). Does not stretch beyond box.
     */
    private static void embedPhoto(XSSFWorkbook wb, Sheet sheet, byte[] photoBytes) {
        String type = CvPhotoSupport.detectImageType(photoBytes);
        int format = "image/png".equals(type) ? Workbook.PICTURE_TYPE_PNG : Workbook.PICTURE_TYPE_JPEG;
        int pictureIdx = wb.addPicture(photoBytes, format);
        XSSFDrawing drawing = (XSSFDrawing) sheet.createDrawingPatriarch();
        // Cols P(15)..T(19), rows 0..4 — matches merge P1:T5
        XSSFClientAnchor anchor = new XSSFClientAnchor(
                0, 0, 0, 0,
                15, 0, 20, 5);
        anchor.setAnchorType(ClientAnchor.AnchorType.MOVE_AND_RESIZE);
        drawing.createPicture(anchor, pictureIdx);
    }

    private record HistoryLine(Integer year, Integer month, String text) {}

    private static List<HistoryLine> expandEducation(Map<String, Object> payload) {
        List<Map<String, Object>> edu = CvEducationSanitizer.resolveForExport(payload);
        List<HistoryLine> lines = new ArrayList<>();
        for (Map<String, Object> row : edu) {
            String school = schoolBase(row);
            String status = str(row.get("status"));
            Integer sy = asInt(row.get("startYear"));
            Integer sm = asInt(row.get("startMonth"));
            Integer ey = asInt(row.get("endYear"));
            Integer em = asInt(row.get("endMonth"));
            if (ey == null) ey = asInt(row.get("year"));
            if (em == null) em = asInt(row.get("month"));

            boolean wrote = false;
            if (sy != null) {
                lines.add(new HistoryLine(sy, sm, school + "　入学"));
                wrote = true;
            }
            if (ey != null) {
                String grad;
                if (status.contains("見込み")) grad = "卒業見込み";
                else if (status.contains("修了")) grad = status;
                else if (status.contains("在学")) grad = status;
                else if (status.contains("卒業")) grad = status;
                else grad = "卒業";
                lines.add(new HistoryLine(ey, em, school + "　" + grad));
                wrote = true;
            }
            if (!wrote) {
                String fallback = CvEducationSanitizer.formatExportLine(row);
                if (!fallback.isBlank()) {
                    lines.add(new HistoryLine(null, null, fallback));
                }
            }
        }
        lines.sort(Comparator
                .comparing((HistoryLine h) -> h.year() == null ? Integer.MAX_VALUE : h.year())
                .thenComparing(h -> h.month() == null ? 0 : h.month()));
        return lines;
    }

    private static String schoolBase(Map<String, Object> e) {
        String school = firstNonBlank(str(e.get("schoolName")), str(e.get("school")), str(e.get("institution")));
        String dept = firstNonBlank(str(e.get("department")), str(e.get("detail")), str(e.get("course")));
        if (!dept.isBlank() && !dept.equals(school) && !dept.toLowerCase(Locale.ROOT).contains("graduat")) {
            // Avoid appending English "Graduated" fragments into Japanese school line.
            if (!SCHOOL_NOISE.matcher(dept).find()) {
                return school.isBlank() ? dept : school + "　" + dept;
            }
        }
        return school;
    }

    private static final java.util.regex.Pattern SCHOOL_NOISE =
            java.util.regex.Pattern.compile("(?i)\\b(graduated|graduate|student|currently)\\b");

    @SuppressWarnings("unchecked")
    private static void assertCapacity(Map<String, Object> payload) {
        List<?> work = payload.get("workExperience") instanceof List<?> l ? l : List.of();
        List<?> certs = payload.get("certifications") instanceof List<?> l ? l : List.of();
        int expanded = expandEducation(payload).size();
        if (expanded > MAX_EDUCATION_ROWS) {
            throw new IllegalArgumentException(
                    "Education expands to " + expanded + " lines; template holds at most " + MAX_EDUCATION_ROWS);
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
        cell.setCellValue(value);
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static boolean looksMobile(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        return digits.startsWith("090") || digits.startsWith("080") || digits.startsWith("070")
                || digits.startsWith("060") || phone.trim().startsWith("+81");
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private static String joinNonBlank(String sep, String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p == null || p.isBlank()) continue;
            if (!sb.isEmpty()) sb.append(sep);
            sb.append(p.trim());
        }
        return sb.toString();
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

    private static Integer firstYear(Map<String, Object> e) {
        Integer y = asInt(e.get("startYear"));
        if (y != null) return y;
        y = asInt(e.get("endYear"));
        if (y != null) return y;
        return asInt(e.get("year"));
    }

    private static Integer firstMonth(Map<String, Object> e) {
        Integer m = asInt(e.get("startMonth"));
        if (m != null) return m;
        m = asInt(e.get("endMonth"));
        if (m != null) return m;
        return asInt(e.get("month"));
    }

    private static Integer certYear(Map<String, Object> c) {
        Integer y = asInt(c.get("year"));
        if (y != null) return y;
        y = asInt(c.get("endYear"));
        if (y != null) return y;
        String date = str(c.get("dateObtained"));
        if (date.length() >= 4) {
            try { return Integer.parseInt(date.substring(0, 4)); } catch (Exception ignored) {}
        }
        return null;
    }

    private static Integer certMonth(Map<String, Object> c) {
        Integer m = asInt(c.get("month"));
        if (m != null) return m;
        m = asInt(c.get("endMonth"));
        if (m != null) return m;
        String date = str(c.get("dateObtained"));
        if (date.length() >= 7) {
            try { return Integer.parseInt(date.substring(5, 7)); } catch (Exception ignored) {}
        }
        return null;
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

    private static String eraLabel(JapaneseDate jd) {
        String s = WAREKI.format(jd);
        int idx = s.indexOf('年');
        return idx > 0 ? s.substring(0, idx).replaceAll("[0-9]", "") : "令和";
    }

    private static int eraYear(JapaneseDate jd) {
        return jd.get(java.time.temporal.ChronoField.YEAR_OF_ERA);
    }
}
