# Approved TRON AI voice reference — Gemini Algenib Robotic

Owner-approved primary TTS identity for English and Japanese.

These files are **reference only**. Live TRON AI synthesizes each new response
dynamically and must never replay these WAVs.

## Approved clips

| Language | File | Duration | First audio | Total synthesis |
|----------|------|----------|-------------|-----------------|
| English | `algenib-en-robotic.wav` | 3.44 s | ~772 ms | ~1,299 ms |
| Japanese | `algenib-ja-robotic.wav` | 8.20 s | ~638 ms | ~1,830 ms |

Format: 24 kHz mono PCM16 little-endian WAV (RIFF).

Source audition: `voice-samples/gemini-tests/` (2026-11-10 JST).

## Exact generation settings (do not invent alternatives)

- Provider: Google Gemini TTS (Interactions API)
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/interactions`
- Model: `gemini-3.8-flash-lite-tts`
- Voice preset: `Algenib`
- Style (speech_metadata annotation):
  `Low, resonant pitch; calm cinematic AI with subtle synthetic resonance, crisp diction and natural conversational pacing.`
- Response format: `audio/l16` @ 24000 Hz
- Streaming: SSE (`stream: true`, `store: false`)
- Post-processing: **none** (no metallic DSP after synthesis)

## Spring configuration mapping

```
TTS_GEMINI_ENABLED=true
GEMINI_API_KEY=...
TTS_GEMINI_MODEL=gemini-3.8-flash-lite-tts
TTS_GEMINI_VOICE=Algenib
TTS_GEMINI_STYLE=Low, resonant pitch; calm cinematic AI with subtle synthetic resonance, crisp diction and natural conversational pacing.
```

Rotate any development API key before production deployment.
Project Free Tier / billing status was unverified during audition.
