package com.tronai.tts;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Subtle TRON robotic coloration for server-generated WAV audio.
 * <p>
 * Browser Web Speech cannot be processed here — only WAV clips we synthesize.
 * Effects stay mild so speech remains highly intelligible.
 */
@Component
public class RoboticVoiceProcessor {

    private final boolean enabled;
    private final double resonance;
    private final double metallic;

    public RoboticVoiceProcessor(
            @Value("${tts.robotic.enabled:true}") boolean enabled,
            @Value("${tts.robotic.resonance:0.18}") double resonance,
            @Value("${tts.robotic.metallic:0.08}") double metallic) {
        this.enabled = enabled;
        this.resonance = clamp(resonance, 0.0, 0.45);
        this.metallic = clamp(metallic, 0.0, 0.25);
    }

    public byte[] process(byte[] wavBytes) {
        if (!enabled || wavBytes == null || !WavAudioSupport.isRiffWav(wavBytes)) {
            return wavBytes;
        }
        int pcmStart = findPcmStart(wavBytes);
        if (pcmStart < 0 || pcmStart >= wavBytes.length - 1) {
            return wavBytes;
        }
        // Preserve header bytes exactly; only touch 16-bit PCM samples.
        byte[] out = wavBytes.clone();
        int prev = 0;
        for (int i = pcmStart; i + 1 < out.length; i += 2) {
            int sample = (out[i] & 0xFF) | (out[i + 1] << 8);
            // Sign-extend 16-bit
            sample = (short) sample;
            double resonant = sample * (1.0 - resonance) + prev * resonance;
            double shaped = resonant + metallic * Math.tanh(resonant / 8000.0) * 1800.0;
            shaped = Math.max(-30000, Math.min(30000, shaped));
            int next = (int) Math.round(shaped);
            out[i] = (byte) (next & 0xFF);
            out[i + 1] = (byte) ((next >> 8) & 0xFF);
            prev = next;
        }
        return out;
    }

    /** Locate PCM payload after the standard `data` chunk header. */
    static int findPcmStart(byte[] wav) {
        int offset = 12;
        while (offset + 8 <= wav.length) {
            boolean isData = wav[offset] == 'd'
                    && wav[offset + 1] == 'a'
                    && wav[offset + 2] == 't'
                    && wav[offset + 3] == 'a';
            int size = (wav[offset + 4] & 0xFF)
                    | ((wav[offset + 5] & 0xFF) << 8)
                    | ((wav[offset + 6] & 0xFF) << 16)
                    | ((wav[offset + 7] & 0xFF) << 24);
            if (isData) {
                return offset + 8;
            }
            if (size < 0) {
                return -1;
            }
            offset += 8 + size;
        }
        return -1;
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
