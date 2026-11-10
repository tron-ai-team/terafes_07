package com.tronai.tts;

/**
 * Result of server-side TTS, including which provider produced the WAV.
 */
public record SynthesisOutcome(byte[] audio, String providerId) {
}
