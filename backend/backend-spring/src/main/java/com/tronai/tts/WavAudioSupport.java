package com.tronai.tts;

/**
 * Minimal PCM ↔ WAV helpers for cloud TTS providers that return raw PCM.
 */
public final class WavAudioSupport {

    private WavAudioSupport() {
    }

    public static boolean isRiffWav(byte[] data) {
        return data != null
                && data.length >= 12
                && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                && data[8] == 'W' && data[9] == 'A' && data[10] == 'V' && data[11] == 'E';
    }

    /** Wrap little-endian 16-bit mono PCM into a RIFF WAVE container. */
    public static byte[] wrapPcm16LeMono(byte[] pcm, int sampleRate) {
        if (pcm == null || pcm.length == 0) {
            return new byte[0];
        }
        int channels = 1;
        int bitsPerSample = 16;
        int byteRate = sampleRate * channels * bitsPerSample / 8;
        int blockAlign = channels * bitsPerSample / 8;
        int dataSize = pcm.length;
        byte[] wav = new byte[44 + dataSize];

        // RIFF header
        wav[0] = 'R'; wav[1] = 'I'; wav[2] = 'F'; wav[3] = 'F';
        putIntLe(wav, 4, 36 + dataSize);
        wav[8] = 'W'; wav[9] = 'A'; wav[10] = 'V'; wav[11] = 'E';

        // fmt chunk
        wav[12] = 'f'; wav[13] = 'm'; wav[14] = 't'; wav[15] = ' ';
        putIntLe(wav, 16, 16);
        putShortLe(wav, 20, (short) 1);
        putShortLe(wav, 22, (short) channels);
        putIntLe(wav, 24, sampleRate);
        putIntLe(wav, 28, byteRate);
        putShortLe(wav, 32, (short) blockAlign);
        putShortLe(wav, 34, (short) bitsPerSample);

        // data chunk
        wav[36] = 'd'; wav[37] = 'a'; wav[38] = 't'; wav[39] = 'a';
        putIntLe(wav, 40, dataSize);
        System.arraycopy(pcm, 0, wav, 44, dataSize);
        return wav;
    }

    public static int parseSampleRateHz(String elevenLabsOutputFormat) {
        if (elevenLabsOutputFormat == null || elevenLabsOutputFormat.isBlank()) {
            return 24000;
        }
        String f = elevenLabsOutputFormat.toLowerCase();
        if (f.contains("48000")) return 48000;
        if (f.contains("44100")) return 44100;
        if (f.contains("32000")) return 32000;
        if (f.contains("22050")) return 22050;
        if (f.contains("16000")) return 16000;
        if (f.contains("8000")) return 8000;
        return 24000;
    }

    private static void putIntLe(byte[] target, int offset, int value) {
        target[offset] = (byte) (value & 0xFF);
        target[offset + 1] = (byte) ((value >> 8) & 0xFF);
        target[offset + 2] = (byte) ((value >> 16) & 0xFF);
        target[offset + 3] = (byte) ((value >> 24) & 0xFF);
    }

    private static void putShortLe(byte[] target, int offset, short value) {
        target[offset] = (byte) (value & 0xFF);
        target[offset + 1] = (byte) ((value >> 8) & 0xFF);
    }
}
