package com.tronai.ai.research.search;

import com.tronai.ai.ChatMessage;

import java.util.ArrayList;
import java.util.List;

/**
 * Bounded chat history window: keep leading system/grounding messages and the most recent turns.
 * Current-turn search evidence (system messages before the first user/assistant turn) is never
 * discarded when truncating long conversations.
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

        List<ChatMessage> leadingSystems = new ArrayList<>();
        List<ChatMessage> conversation = new ArrayList<>();
        boolean seenConversation = false;
        for (ChatMessage m : messages) {
            if (m == null) {
                continue;
            }
            boolean system = "system".equalsIgnoreCase(m.getRole());
            if (!seenConversation && system) {
                leadingSystems.add(m);
            } else {
                seenConversation = true;
                conversation.add(m);
            }
        }

        // Always preserve system prompt + current-turn search evidence.
        int reserved = Math.max(1, leadingSystems.size());
        int keepConversation = Math.max(2, limit - reserved);
        if (conversation.size() > keepConversation) {
            conversation = conversation.subList(conversation.size() - keepConversation, conversation.size());
        }

        List<ChatMessage> out = new ArrayList<>(reserved + conversation.size());
        out.addAll(leadingSystems);
        out.addAll(conversation);
        return out;
    }
}
