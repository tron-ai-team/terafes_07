package com.tronai.career.profile;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Normalize unambiguous date inputs to LocalDate (ISO storage).
 */
public final class ProfileDateParser {

    private static final List<DateTimeFormatter> FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("yyyy/M/d"),
            DateTimeFormatter.ofPattern("yyyy.M.d"),
            DateTimeFormatter.ofPattern("yyyy-M-d"),
            DateTimeFormatter.ofPattern("yyyy年M月d日", Locale.JAPAN)
    );

    private static final Pattern YMD = Pattern.compile(
            "^\\s*(\\d{4})[/\\-.](\\d{1,2})[/\\-.](\\d{1,2})\\s*$");

    private ProfileDateParser() {}

    public static LocalDate parseOptional(Object raw) {
        if (raw == null) return null;
        if (raw instanceof LocalDate d) return d;
        String value = String.valueOf(raw).trim();
        if (value.isEmpty() || "null".equalsIgnoreCase(value)) return null;
        for (DateTimeFormatter formatter : FORMATTERS) {
            try {
                return LocalDate.parse(value, formatter);
            } catch (DateTimeParseException ignored) {
                // try next
            }
        }
        Matcher m = YMD.matcher(value);
        if (m.matches()) {
            try {
                return LocalDate.of(
                        Integer.parseInt(m.group(1)),
                        Integer.parseInt(m.group(2)),
                        Integer.parseInt(m.group(3)));
            } catch (Exception ignored) {
                // fall through
            }
        }
        throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Please enter a valid date of birth. Expected format: YYYY-MM-DD");
    }
}
