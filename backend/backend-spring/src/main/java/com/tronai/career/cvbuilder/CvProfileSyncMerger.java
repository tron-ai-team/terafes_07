package com.tronai.career.cvbuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Deterministic Candidate Profile → CV draft merge.
 * Default mode FILL_BLANK never overwrites non-empty manual CV edits.
 */
public final class CvProfileSyncMerger {

    public enum Mode {
        /** Fill only blank / empty draft fields from profile. Preserve manual edits. */
        FILL_BLANK,
        /** Overwrite profile-mapped scalars; arrays fill only when empty (never wipe non-empty lists). */
        OVERWRITE_SCALARS,
        /** Replace all profile-mapped fields from profile; preserve draft-only fields. */
        REPLACE_ALL
    }

    public record SyncReport(
            Mode mode,
            List<String> filled,
            List<String> preserved,
            List<String> conflicts,
            List<String> missingInProfile,
            List<String> draftOnlyPreserved
    ) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("mode", mode.name());
            m.put("filled", filled);
            m.put("preserved", preserved);
            m.put("conflicts", conflicts);
            m.put("missingInProfile", missingInProfile);
            m.put("draftOnlyPreserved", draftOnlyPreserved);
            return m;
        }
    }

    public record MergeResult(Map<String, Object> payload, SyncReport report) {}

    private static final Set<String> DRAFT_ONLY = Set.of(
            "favoriteSubjects", "hobbies", "healthStatus", "extracurricular", "sports",
            "educationExportIds", "educationExportSelection", "motivationCompany", "careerSummary",
            "cvPhotoObjectKey", "photoIncluded", "photoSource", "includePhotoOnEnglishResume",
            "educationSanitized"
    );

    private static final Set<String> LIST_FIELDS = Set.of(
            "education", "workExperience", "skills", "certifications", "projects", "languages"
    );

    private CvProfileSyncMerger() {}

    public static Mode parseMode(Map<String, Object> body) {
        if (body == null) return Mode.FILL_BLANK;
        if (Boolean.TRUE.equals(body.get("replaceAll"))
                || "true".equalsIgnoreCase(String.valueOf(body.getOrDefault("replaceAll", "false")))) {
            return Mode.REPLACE_ALL;
        }
        Object raw = body.get("mode");
        if (raw == null || String.valueOf(raw).isBlank()) return Mode.FILL_BLANK;
        String m = String.valueOf(raw).trim().toUpperCase(Locale.ROOT);
        return switch (m) {
            case "REPLACE_ALL", "REPLACE" -> Mode.REPLACE_ALL;
            case "OVERWRITE_SCALARS", "OVERWRITE" -> Mode.OVERWRITE_SCALARS;
            default -> Mode.FILL_BLANK;
        };
    }

    public static MergeResult merge(Map<String, Object> current, Map<String, Object> fromProfile, Mode mode) {
        Map<String, Object> draft = current == null ? Map.of() : current;
        Map<String, Object> profile = fromProfile == null ? Map.of() : fromProfile;
        Map<String, Object> merged = new LinkedHashMap<>(draft);

        List<String> filled = new ArrayList<>();
        List<String> preserved = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> draftOnly = new ArrayList<>();

        for (String key : DRAFT_ONLY) {
            if (draft.containsKey(key) && !isBlankValue(draft.get(key))) {
                draftOnly.add(key);
            }
        }

        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(profile.keySet());
        keys.addAll(draft.keySet());

        for (String key : keys) {
            if (DRAFT_ONLY.contains(key)) {
                // Always keep draft-only values already in merged.
                continue;
            }
            Object incoming = profile.get(key);
            Object existing = draft.get(key);
            boolean profileHas = !isBlankValue(incoming);
            boolean draftHas = !isBlankValue(existing);

            if (!profileHas) {
                if (!draftHas && isProfileMappedScalar(key)) {
                    missing.add(key);
                }
                continue;
            }

            if (mode == Mode.REPLACE_ALL) {
                if (draftHas && !valuesEqual(existing, incoming)) {
                    conflicts.add(key);
                }
                merged.put(key, incoming);
                filled.add(key);
                continue;
            }

            if (LIST_FIELDS.contains(key) || incoming instanceof List<?> || incoming instanceof Map<?, ?>) {
                if (!draftHas) {
                    merged.put(key, incoming);
                    filled.add(key);
                } else {
                    preserved.add(key);
                    if (!valuesEqual(existing, incoming)) {
                        conflicts.add(key);
                    }
                }
                continue;
            }

            // Scalars
            if (mode == Mode.OVERWRITE_SCALARS) {
                if (draftHas && !valuesEqual(existing, incoming)) {
                    conflicts.add(key);
                }
                merged.put(key, incoming);
                filled.add(key);
            } else {
                // FILL_BLANK
                if (!draftHas) {
                    merged.put(key, incoming);
                    filled.add(key);
                } else {
                    preserved.add(key);
                    if (!valuesEqual(existing, incoming)) {
                        conflicts.add(key);
                    }
                }
            }
        }

        // REPLACE_ALL still keeps draft-only fields from current.
        if (mode == Mode.REPLACE_ALL) {
            for (String key : DRAFT_ONLY) {
                if (draft.containsKey(key)) {
                    merged.put(key, draft.get(key));
                }
            }
            if (draft.get("educationExportIds") != null) {
                merged.put("educationExportIds", draft.get("educationExportIds"));
            }
        }

        return new MergeResult(merged, new SyncReport(mode, filled, preserved, conflicts, missing, draftOnly));
    }

    /** Light normalization that preserves factual meaning. */
    public static Map<String, Object> normalizePayload(Map<String, Object> payload) {
        Map<String, Object> out = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        Object dob = out.get("dateOfBirth");
        if (dob != null) {
            String norm = normalizeDate(String.valueOf(dob));
            if (!norm.isBlank()) out.put("dateOfBirth", norm);
        }
        Object postal = out.get("postalCode");
        if (postal != null) {
            String p = normalizePostal(String.valueOf(postal));
            if (!p.isBlank()) out.put("postalCode", p);
        }
        Object phone = out.get("phone");
        if (phone != null) {
            String ph = normalizePhone(String.valueOf(phone));
            if (!ph.isBlank()) out.put("phone", ph);
        }
        Object furigana = out.get("furigana");
        if (furigana != null) {
            out.put("furigana", String.valueOf(furigana).trim().replace('ﾞ', '゛').replace('ﾟ', '゜'));
        }
        Object nameJa = out.get("nameJa");
        if (nameJa != null) {
            out.put("nameJa", String.valueOf(nameJa).trim());
        }
        return out;
    }

    static String normalizeDate(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.isBlank() || "null".equalsIgnoreCase(s)) return "";
        // Already ISO
        if (s.matches("\\d{4}-\\d{2}-\\d{2}")) return s;
        // yyyy/MM/dd or yyyy.MM.dd
        if (s.matches("\\d{4}[/\\.年]\\d{1,2}[/\\.月]\\d{1,2}日?")) {
            String digits = s.replaceAll("[^0-9]", " ").trim().replaceAll("\\s+", " ");
            String[] p = digits.split(" ");
            if (p.length >= 3) {
                return String.format("%04d-%02d-%02d",
                        Integer.parseInt(p[0]), Integer.parseInt(p[1]), Integer.parseInt(p[2]));
            }
        }
        return s;
    }

    static String normalizePostal(String raw) {
        if (raw == null) return "";
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() == 7) {
            return digits.substring(0, 3) + "-" + digits.substring(3);
        }
        return raw.trim();
    }

    static String normalizePhone(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.isBlank()) return "";
        String digits = s.replaceAll("[^0-9]", "");
        if (digits.length() == 11 && digits.startsWith("0")) {
            return digits.substring(0, 3) + "-" + digits.substring(3, 7) + "-" + digits.substring(7);
        }
        if (digits.length() == 10 && digits.startsWith("0")) {
            return digits.substring(0, 2) + "-" + digits.substring(2, 6) + "-" + digits.substring(6);
        }
        return s;
    }

    private static boolean isProfileMappedScalar(String key) {
        return Set.of(
                "fullName", "nameJa", "furigana", "dateOfBirth", "nationality", "gender",
                "addressText", "postalCode", "email", "phone", "selfPr", "careerGoals", "motivationGeneral"
        ).contains(key);
    }

    private static boolean isBlankValue(Object v) {
        if (v == null) return true;
        if (v instanceof String s) return s.isBlank() || "[]".equals(s.trim()) || "{}".equals(s.trim());
        if (v instanceof List<?> l) return l.isEmpty();
        if (v instanceof Map<?, ?> m) return m.isEmpty();
        return String.valueOf(v).isBlank();
    }

    private static boolean valuesEqual(Object a, Object b) {
        if (a instanceof List<?> || b instanceof List<?> || a instanceof Map<?, ?> || b instanceof Map<?, ?>) {
            return Objects.equals(String.valueOf(a), String.valueOf(b));
        }
        return Objects.equals(String.valueOf(a).trim(), String.valueOf(b).trim());
    }
}
