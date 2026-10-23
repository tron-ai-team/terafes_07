package com.tronai.desktop.policy;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class CommandTokenizer {

    private CommandTokenizer() {
    }

    public record Tokens(List<String> argv, String rejectedReason) {
        public boolean rejected() {
            return rejectedReason != null;
        }
    }

    public static Tokens tokenize(String command) {
        if (command == null || command.isBlank()) {
            return new Tokens(List.of(), "Command is empty");
        }
        List<String> argv = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;
        char quote = 0;
        for (int i = 0; i < command.length(); i++) {
            char c = command.charAt(i);
            if (quoted) {
                if (c == quote) {
                    quoted = false;
                } else if (c == '\n' || c == '\r' || c == '\0') {
                    return new Tokens(List.of(), "Command contains a forbidden control character");
                } else {
                    current.append(c);
                }
                continue;
            }
            if (c == '"' || c == '\'') {
                quoted = true;
                quote = c;
                continue;
            }
            if (Character.isWhitespace(c)) {
                if (c == '\n' || c == '\r') {
                    return new Tokens(List.of(), "Command contains a forbidden control character");
                }
                if (!current.isEmpty()) {
                    argv.add(current.toString());
                    current.setLength(0);
                }
                continue;
            }
            if ("&|;<>`$".indexOf(c) >= 0) {
                return new Tokens(List.of(), "Shell operators are not allowed");
            }
            current.append(c);
        }
        if (quoted) {
            return new Tokens(List.of(), "Command has unbalanced quotes");
        }
        if (!current.isEmpty()) {
            argv.add(current.toString());
        }
        if (argv.isEmpty()) {
            return new Tokens(List.of(), "Command is empty");
        }
        return new Tokens(List.copyOf(argv), null);
    }

    public static String executableName(String token) {
        if (token == null || token.isBlank()) {
            return "";
        }
        String name = token.replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".exe") || lower.endsWith(".cmd") || lower.endsWith(".bat")) {
            lower = lower.substring(0, lower.lastIndexOf('.'));
        }
        return lower;
    }
}

