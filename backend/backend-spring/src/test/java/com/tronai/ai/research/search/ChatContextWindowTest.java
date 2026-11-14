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
}
