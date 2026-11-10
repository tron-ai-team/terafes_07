package com.tronai.career.profile;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conservative suggestions from legacy free-text education.
 * Never auto-replaces stored education without explicit client confirmation.
 */
public final class EducationLegacyMigrator {

    private static final Pattern YEAR_HINT = Pattern.compile("(20\\d{2}|19\\d{2})");
    private static final Pattern SCHOOL_HINT = Pattern.compile(
            "(大学|大学院|高校|高等学校|専門学校|短期大学|高専|language school|university|college|school)",
            Pattern.CASE_INSENSITIVE);

    private EducationLegacyMigrator() {}

    public static boolean looksUnstructured(List<Map<String, Object>> education) {
        if (education == null || education.isEmpty()) return false;
        int suspicious = 0;
        for (Map<String, Object> row : education) {
            String school = str(row.get("schoolName"), str(row.get("school"), ""));
            String detail = str(row.get("detail"), "");
            boolean structured = row.containsKey("schoolType") || row.containsKey("startYear")
                    || row.containsKey("status") || row.containsKey("department");
            if (structured) continue;
            String blob = (school + " " + detail).toLowerCase(Locale.ROOT);
            if (school.length() > 80
                    || blob.contains("住所")
                    || blob.contains("電話")
                    || blob.contains("自己pr")
                    || blob.contains("志望動機")
                    || blob.contains("職務経歴")
                    || blob.contains("生年月日")
                    || (blob.contains("〒") && !SCHOOL_HINT.matcher(blob).find())) {
                suspicious++;
            }
        }
        return suspicious >= Math.max(1, education.size() / 2);
    }

    public static List<Map<String, Object>> suggest(String legacyText) {
        List<Map<String, Object>> suggestions = new ArrayList<>();
        if (legacyText == null || legacyText.isBlank()) return suggestions;
        for (String line : legacyText.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;
            if (isNoiseLine(trimmed)) continue;
            if (!SCHOOL_HINT.matcher(trimmed).find() && !YEAR_HINT.matcher(trimmed).find()) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("schoolName", trimmed.length() > 120 ? trimmed.substring(0, 120) : trimmed);
            row.put("schoolNameJa", "");
            row.put("country", "");
            row.put("schoolType", inferSchoolType(trimmed));
            row.put("department", "");
            row.put("course", "");
            row.put("startYear", firstYear(trimmed));
            row.put("startMonth", null);
            row.put("endYear", secondYear(trimmed));
            row.put("endMonth", null);
            row.put("status", inferStatus(trimmed));
            row.put("suggested", true);
            row.put("needsReview", true);
            suggestions.add(row);
        }
        return suggestions;
    }

    public static String joinLegacy(List<Map<String, Object>> education) {
        if (education == null) return "";
        List<String> lines = new ArrayList<>();
        for (Map<String, Object> row : education) {
            String school = str(row.get("schoolName"), str(row.get("school"), ""));
            String detail = str(row.get("detail"), "");
            if (!school.isBlank() && !detail.isBlank()) {
                lines.add(school + " — " + detail);
            } else if (!school.isBlank()) {
                lines.add(school);
            } else if (!detail.isBlank()) {
                lines.add(detail);
            }
        }
        return String.join("\n", lines);
    }

    private static boolean isNoiseLine(String line) {
        String l = line.toLowerCase(Locale.ROOT);
        return l.contains("住所") || l.contains("電話") || l.contains("email")
                || l.contains("自己pr") || l.contains("志望動機") || l.startsWith("〒")
                || l.contains("氏名") || l.contains("生年月日");
    }

    private static String inferSchoolType(String text) {
        String t = text.toLowerCase(Locale.ROOT);
        if (t.contains("大学院") || t.contains("graduate")) return "Graduate School";
        if (t.contains("大学") || t.contains("university") || t.contains("college")) return "University";
        if (t.contains("専門") || t.contains("vocational")) return "Vocational / Specialized School";
        if (t.contains("高校") || t.contains("high school")) return "High School";
        if (t.contains("中学") || t.contains("junior high")) return "Junior High School";
        if (t.contains("語学") || t.contains("language")) return "Language School";
        return "Other";
    }

    private static String inferStatus(String text) {
        String t = text.toLowerCase(Locale.ROOT);
        if (t.contains("在学") || t.contains("currently")) return "Currently studying";
        if (t.contains("卒業見込") || t.contains("expected")) return "Expected graduation";
        if (t.contains("中退") || t.contains("withdrawn")) return "Withdrawn";
        if (t.contains("卒業") || t.contains("graduat")) return "Graduated";
        return "Other";
    }

    private static Integer firstYear(String text) {
        Matcher m = YEAR_HINT.matcher(text);
        if (m.find()) return Integer.parseInt(m.group(1));
        return null;
    }

    private static Integer secondYear(String text) {
        Matcher m = YEAR_HINT.matcher(text);
        if (!m.find()) return null;
        if (m.find()) return Integer.parseInt(m.group(1));
        return null;
    }

    private static String str(Object a, String fallback) {
        if (a == null) return fallback;
        String s = String.valueOf(a).trim();
        return s.isEmpty() ? fallback : s;
    }

    private static String str(Object a, Object b, String fallback) {
        String s = str(a, "");
        if (!s.isEmpty()) return s;
        return str(b, fallback);
    }
}
