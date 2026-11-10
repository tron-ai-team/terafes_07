package com.tronai.tts;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RoboticVoiceProcessorTest {

    @Test
    @DisplayName("Robotic processor keeps RIFF WAV structure and changes PCM mildly")
    void processesWavWithoutBreakingContainer() {
        byte[] pcm = new byte[480];
        for (int i = 0; i < pcm.length; i += 2) {
            short s = (short) (i * 40);
            pcm[i] = (byte) (s & 0xFF);
            pcm[i + 1] = (byte) ((s >> 8) & 0xFF);
        }
        byte[] wav = WavAudioSupport.wrapPcm16LeMono(pcm, 24000);
        assertThat(WavAudioSupport.isRiffWav(wav))
                .as("fixture WAV must be valid before processing")
                .isTrue();
        RoboticVoiceProcessor processor = new RoboticVoiceProcessor(true, 0.2, 0.1);
        byte[] out = processor.process(wav);

        assertThat(WavAudioSupport.isRiffWav(out)).isTrue();
        assertThat(out.length).isEqualTo(wav.length);
        assertThat(out).isNotEqualTo(wav);
    }

    @Test
    @DisplayName("Disabled robotic processor is a no-op")
    void disabledIsNoOp() {
        byte[] wav = WavAudioSupport.wrapPcm16LeMono(new byte[]{1, 0, 2, 0}, 24000);
        RoboticVoiceProcessor processor = new RoboticVoiceProcessor(false, 0.2, 0.1);
        assertThat(processor.process(wav)).isSameAs(wav);
    }
}
