package com.tronai.ai.research.search;

import com.tronai.ai.ChatMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChatContextWindowTest {

    @Test
    @DisplayName("Keeps system prompt and most recent turns")
    void keepsSystemAndRecent() {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.builder().role("system").content("SYS").build());
        for (int i = 0; i < 20; i++) {
            messages.add(ChatMessage.builder().role("user").content("u" + i).build());
            messages.add(ChatMessage.builder().role("assistant").content("a" + i).build());
        }
        List<ChatMessage> out = ChatContextWindow.truncate(messages, 6);
        assertThat(out.get(0).getRole()).isEqualTo("system");
        assertThat(out.get(0).getContent()).isEqualTo("SYS");
        assertThat(out.size()).isLessThanOrEqualTo(6);
        assertThat(out.get(out.size() - 1).getContent()).isEqualTo("a19");
    }

    @Test
    @DisplayName("Preserves search evidence system message across 50+ turn histories")
    void preservesSearchEvidenceInLongConversation() {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.builder().role("system").content("SYS_PROMPT_WITH_SEARCH_NOTE").build());
        messages.add(ChatMessage.builder().role("system").content("Untrusted web evidence follows. URL: https://example.com").build());
        for (int i = 0; i < 50; i++) {
            messages.add(ChatMessage.builder().role("user").content("user-turn-" + i).build());
            messages.add(ChatMessage.builder().role("assistant").content("asst-turn-" + i).build());
        }
        assertThat(messages).hasSize(102);

        List<ChatMessage> out = ChatContextWindow.truncate(messages, 24);

        assertThat(out.get(0).getContent()).isEqualTo("SYS_PROMPT_WITH_SEARCH_NOTE");
        assertThat(out.get(1).getContent()).contains("Untrusted web evidence");
        assertThat(out.get(1).getContent()).contains("https://example.com");
        assertThat(out.stream().filter(m -> "system".equalsIgnoreCase(m.getRole())).count()).isEqualTo(2);
        assertThat(out.size()).isLessThanOrEqualTo(24);
        assertThat(out.get(out.size() - 1).getContent()).isEqualTo("asst-turn-49");
        assertThat(out.stream().anyMatch(m -> "user-turn-0".equals(m.getContent()))).isFalse();
    }

    @Test
    @DisplayName("Does not drop grounding when budget is tight")
    void keepsEvidenceWhenBudgetTight() {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.builder().role("system").content("SYS").build());
        messages.add(ChatMessage.builder().role("system").content("EVIDENCE").build());
        for (int i = 0; i < 30; i++) {
            messages.add(ChatMessage.builder().role("user").content("u" + i).build());
            messages.add(ChatMessage.builder().role("assistant").content("a" + i).build());
        }
        List<ChatMessage> out = ChatContextWindow.truncate(messages, 4);
        assertThat(out.get(0).getContent()).isEqualTo("SYS");
        assertThat(out.get(1).getContent()).isEqualTo("EVIDENCE");
        assertThat(out.size()).isGreaterThanOrEqualTo(4);
    }
}
