package com.tronai.ai.research.search;

import com.tronai.ai.ChatMessage;

import java.util.ArrayList;
import java.util.List;

/**
 * Bounded chat history window: keep the system prompt and the most recent turns.
 */
public final class ChatContextWindow {

    private ChatContextWindow() {
    }

    public static List<ChatMessage> truncate(List<ChatMessage> messages, int maxMessages) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }
        int limit = Math.max(4, maxMessages);
        if (messages.size() <= limit) {
            return List.copyOf(messages);
        }

        ChatMessage system = null;
        List<ChatMessage> rest = new ArrayList<>();
        for (ChatMessage m : messages) {
            if (system == null && m != null && "system".equalsIgnoreCase(m.getRole())) {
                system = m;
            } else if (m != null) {
                rest.add(m);
            }
        }
        int keep = system == null ? limit : Math.max(2, limit - 1);
        if (rest.size() > keep) {
            rest = rest.subList(rest.size() - keep, rest.size());
        }
        List<ChatMessage> out = new ArrayList<>(rest.size() + 1);
        if (system != null) {
            out.add(system);
        }
        out.addAll(rest);
        return out;
    }
}
