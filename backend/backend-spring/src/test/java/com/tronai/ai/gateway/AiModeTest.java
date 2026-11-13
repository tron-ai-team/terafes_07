package com.tronai.ai.gateway;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiModeTest {

    @Test
    @DisplayName("fromString accepts gateway modes and defaults blank to AUTO")
    void fromStringParsing() {
        assertThat(AiMode.fromString(null)).isEqualTo(AiMode.AUTO);
        assertThat(AiMode.fromString("")).isEqualTo(AiMode.AUTO);
        assertThat(AiMode.fromString("fast")).isEqualTo(AiMode.FAST);
        assertThat(AiMode.fromString("SMART")).isEqualTo(AiMode.SMART);
        assertThat(AiMode.fromString("CLOUD")).isEqualTo(AiMode.CLOUD);
        assertThat(AiMode.fromString("ULTRA")).isEqualTo(AiMode.ULTRA);
        assertThat(AiMode.fromString("QUALITY")).isEqualTo(AiMode.QUALITY);

        assertThatThrownBy(() -> AiMode.fromString("NOT_A_MODE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown AI mode");
    }

    @Test
    @DisplayName("routingMode maps QUALITY to SMART and ULTRA consumes credits")
    void routingAndCredits() {
        assertThat(AiMode.QUALITY.routingMode()).isEqualTo(AiMode.SMART);
        assertThat(AiMode.SMART.routingMode()).isEqualTo(AiMode.SMART);
        assertThat(AiMode.CLOUD.routingMode()).isEqualTo(AiMode.CLOUD);
        assertThat(AiMode.ULTRA.consumesUltraCredits()).isTrue();
        assertThat(AiMode.FAST.consumesUltraCredits()).isFalse();
        assertThat(AiMode.AUTO.consumesUltraCredits()).isFalse();
    }
}
