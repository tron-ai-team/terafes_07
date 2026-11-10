package com.tronai.career.cvbuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Cleans CV draft education lists that were polluted by OCR / Excel-cell scraping
 * of filled 履歴書 templates (labels, year/month fragments, address, gender, etc.).
 * Never mutates Candidate Profile storage — operates on CV payload copies only.
 */
public final class CvEducationSanitizer {

    private static final Pattern YEAR_MONTH_ONLY = Pattern.compile("^\\d{4}\\s*\\d{1,2}$");
    private static final Pattern YEAR_ONLY = Pattern.compile("^(19|20)\\d{2}$");
    private static final Pattern SCHOOL_HINT = Pattern.compile(
            "(大学|大学院|高校|高等学校|中学|中学校|専門学校|短期大学|高専|学院|カレッジ|学校|"
                    + "university|college|school|academy|institute|入学|卒業|見込|language)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private static final Set<String> TEMPLATE_NOISE = Set.of(
            "履歴書", "履 歴 書", "学歴", "学　歴", "職歴", "職　歴", "賞罰", "賞　罰", "以上",
            "現住所", "生年月日", "連絡先", "休暇中の", "電話", "携帯電話", "国籍",
            "国", "籍", "男", "女", "・", "※", "なし", "な　し", "スリランカ",
            "（留学生のみ記入）", "(留学生のみ記入)", "（満", "(満",
            "学 歴 ・ 職 歴 （各別にまとめて書く）", "学歴・職歴（各別にまとめて書く）"
    );

    private CvEducationSanitizer() {}

    public record SanitizeResult(
            List<Map<String, Object>> kept,
            List<Map<String, Object>> rejected,
            int inputCount,
            int duplicateCount
    ) {}

    /**
     * Sanitize education for CV use. Prefer structured schoolName/department/years when present.
     */
    @SuppressWarnings("unchecked")
    public static SanitizeResult sanitize(Object rawEducation) {
        List<Map<String, Object>> input = toMapList(rawEducation);
        List<Map<String, Object>> kept = new ArrayList<>();
        List<Map<String, Object>> rejected = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int duplicates = 0;

        for (Map<String, Object> row : input) {
            Map<String, Object> normalized = normalizeRow(row);
            String label = displayLabel(normalized);
            if (label.isBlank()) {
                rejected.add(copyWithReason(row, "empty"));
                continue;
            }
            if (isNoise(label, normalized)) {
                rejected.add(copyWithReason(row, "template_or_fragment_noise"));
                continue;
            }
            String dedupe = dedupeKey(normalized, label);
            if (!seen.add(dedupe)) {
                duplicates++;
                rejected.add(copyWithReason(row, "duplicate"));
                continue;
            }
            kept.add(normalized);
        }

        kept.sort((a, b) -> {
            Integer ay = asInt(a.get("startYear"));
            Integer by = asInt(b.get("startYear"));
            if (ay == null && by == null) {
                Integer aey = asInt(a.get("endYear"));
                Integer bey = asInt(b.get("endYear"));
                if (aey == null && bey == null) return displayLabel(a).compareTo(displayLabel(b));
                if (aey == null) return 1;
                if (bey == null) return -1;
                return Integer.compare(aey, bey);
            }
            if (ay == null) return 1;
            if (by == null) return -1;
            return Integer.compare(ay, by);
        });

        return new SanitizeResult(kept, rejected, input.size(), duplicates);
    }

    /**
     * Resolve the education list that will actually be written to a template.
     * Honours optional {@code educationExportIds} / {@code educationExportSelection} on the payload.
     */
    public static List<Map<String, Object>> resolveForExport(Map<String, Object> payload) {
        SanitizeResult sanitized = sanitize(payload.get("education"));
        List<Map<String, Object>> kept = sanitized.kept();

        Object selection = payload.get("educationExportIds");
        if (selection == null) selection = payload.get("educationExportSelection");
        if (selection instanceof List<?> ids && !ids.isEmpty()) {
            Set<String> want = new HashSet<>();
            for (Object id : ids) {
                if (id != null) want.add(String.valueOf(id).trim());
            }
            List<Map<String, Object>> selected = new ArrayList<>();
            for (Map<String, Object> row : kept) {
                String id = str(row.get("id"));
                if (want.contains(id) || want.contains(displayLabel(row))) {
                    selected.add(row);
                }
            }
            // Also allow selecting from original raw list by index string "0","1",...
            if (selected.isEmpty()) {
                List<Map<String, Object>> raw = toMapList(payload.get("education"));
                for (Object id : ids) {
                    try {
                        int idx = Integer.parseInt(String.valueOf(id).trim());
                        if (idx >= 0 && idx < raw.size()) {
                            Map<String, Object> n = normalizeRow(raw.get(idx));
                            if (!isNoise(displayLabel(n), n)) selected.add(n);
                        }
                    } catch (NumberFormatException ignored) {
                        // not an index
                    }
                }
            }
            return selected;
        }
        return kept;
    }

    public static Map<String, Object> preview(Map<String, Object> payload, int maxRows) {
        SanitizeResult sanitized = sanitize(payload.get("education"));
        List<Map<String, Object>> exportRows = resolveForExport(payload);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("inputCount", sanitized.inputCount());
        out.put("keptCount", sanitized.kept().size());
        out.put("rejectedCount", sanitized.rejected().size());
        out.put("duplicateCount", sanitized.duplicateCount());
        out.put("templateCapacity", maxRows);
        out.put("exportCount", exportRows.size());
        out.put("overflow", exportRows.size() > maxRows);
        out.put("kept", sanitized.kept());
        out.put("rejected", sanitized.rejected());
        out.put("willExport", exportRows);
        out.put("message", exportRows.size() > maxRows
                ? "Education has " + exportRows.size() + " exportable entries; template holds at most "
                + maxRows + ". Select entries via educationExportIds or use another template."
                : "OK");
        return out;
    }

    static boolean isNoise(String label, Map<String, Object> row) {
        String compact = label.replaceAll("\\s+", "").trim();
        if (compact.isEmpty()) return true;
        if (TEMPLATE_NOISE.contains(label.trim()) || TEMPLATE_NOISE.contains(compact)) return true;
        String lower = label.toLowerCase(Locale.ROOT);
        for (String n : TEMPLATE_NOISE) {
            if (n.length() >= 2 && (label.equals(n) || compact.equals(n.replaceAll("\\s+", "")))) return true;
        }
        if (YEAR_MONTH_ONLY.matcher(label.trim()).matches()) return true;
        if (YEAR_ONLY.matcher(label.trim()).matches()) return true;
        if (compact.length() <= 1) return true;
        if (compact.equals("男") || compact.equals("女") || compact.equals("・") || compact.equals("※")) return true;
        if (lower.contains("現住所") || lower.contains("生年月日") || lower.contains("連絡先")) return true;
        if (lower.contains("履") && lower.contains("歴") && lower.contains("書") && !SCHOOL_HINT.matcher(label).find()) {
            return true;
        }
        if (label.contains("ちょうめ") || label.contains("丁目")) {
            if (!SCHOOL_HINT.matcher(label).find()) return true;
        }
        // Structured rows with real schoolName are kept even without keyword if schoolType/years set.
        boolean structured = notBlank(row.get("schoolType")) || asInt(row.get("startYear")) != null
                || asInt(row.get("endYear")) != null || notBlank(row.get("department"));
        if (structured && notBlank(row.get("schoolName"))) return false;
        // Unstructured OCR scrapes must look like education lines.
        return !SCHOOL_HINT.matcher(label).find();
    }

    private static Map<String, Object> normalizeRow(Map<String, Object> row) {
        Map<String, Object> m = new LinkedHashMap<>();
        String schoolName = firstNonBlank(row.get("schoolName"), row.get("school"));
        String detail = firstNonBlank(row.get("detail"), row.get("department"));
        String id = str(row.get("id"));
        if (id.isBlank()) id = UUID.randomUUID().toString();
        m.put("id", id);
        m.put("schoolName", schoolName);
        m.put("schoolNameJa", str(row.get("schoolNameJa")));
        m.put("country", str(row.get("country")));
        m.put("schoolType", str(row.get("schoolType")));
        m.put("department", firstNonBlank(row.get("department"), detail));
        m.put("course", str(row.get("course")));
        // Accept aliases: year/month often mean graduation (end); startYear/endYear preferred when present.
        Integer startYear = asInt(row.get("startYear"));
        Integer startMonth = asInt(row.get("startMonth"));
        Integer endYear = asInt(row.get("endYear"));
        Integer endMonth = asInt(row.get("endMonth"));
        if (endYear == null) endYear = asInt(row.get("year"));
        if (endMonth == null) endMonth = asInt(row.get("month"));
        if (startYear == null) startYear = asInt(row.get("fromYear"));
        if (startMonth == null) startMonth = asInt(row.get("fromMonth"));
        m.put("startYear", startYear);
        m.put("startMonth", startMonth);
        m.put("endYear", endYear);
        m.put("endMonth", endMonth);
        m.put("status", str(row.get("status")));
        m.put("school", schoolName);
        m.put("detail", firstNonBlank(detail, schoolName));
        m.put("period", str(row.get("period")));
        return m;
    }

    public static String displayLabel(Map<String, Object> row) {
        String school = firstNonBlank(row.get("schoolName"), row.get("school"));
        String detail = str(row.get("detail"));
        String dept = str(row.get("department"));
        if (!school.isBlank() && !detail.isBlank() && !detail.equals(school)) {
            return (school + " " + detail).trim();
        }
        if (!school.isBlank()) return school;
        if (!dept.isBlank()) return dept;
        return detail;
    }

    public static String formatExportLine(Map<String, Object> e) {
        String detail = str(e.get("detail"));
        if (!detail.isBlank() && SCHOOL_HINT.matcher(detail).find()) return detail.trim();
        String school = firstNonBlank(e.get("schoolName"), e.get("school"));
        String dept = str(e.get("department"));
        String status = str(e.get("status"));
        String period = str(e.get("period"));
        StringBuilder sb = new StringBuilder();
        if (!school.isBlank()) sb.append(school);
        if (!dept.isBlank() && !dept.equals(school)) {
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(dept);
        }
        if (!status.isBlank()) {
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(status);
        }
        if (!period.isBlank()) {
            if (!sb.isEmpty()) sb.append(' ');
            sb.append(period);
        }
        Integer sy = asInt(e.get("startYear"));
        Integer ey = asInt(e.get("endYear"));
        if (sb.isEmpty() && detail.isBlank() && sy == null && ey == null) return "";
        if (!sb.isEmpty()) return sb.toString().trim();
        return detail.trim();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> toMapList(Object raw) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (!(raw instanceof List<?> list)) return out;
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                out.add(new LinkedHashMap<>((Map<String, Object>) map));
            } else if (item instanceof String s && !s.isBlank()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("school", s.trim());
                m.put("schoolName", s.trim());
                m.put("detail", "");
                out.add(m);
            }
        }
        return out;
    }

    private static Map<String, Object> copyWithReason(Map<String, Object> row, String reason) {
        Map<String, Object> m = new LinkedHashMap<>(row);
        m.put("rejectReason", reason);
        return m;
    }

    private static String dedupeKey(Map<String, Object> row, String label) {
        return (label + "|" + row.get("startYear") + "|" + row.get("endYear") + "|" + row.get("status"))
                .toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private static boolean notBlank(Object o) {
        return o != null && !String.valueOf(o).isBlank();
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static String firstNonBlank(Object a, Object b) {
        String s = str(a);
        if (!s.isEmpty()) return s;
        return str(b);
    }

    private static Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        try {
            return Integer.parseInt(s);
        } catch (Exception e) {
            return null;
        }
    }
}
