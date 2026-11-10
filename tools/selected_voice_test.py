#!/usr/bin/env python3
"""Test a user-selected ElevenLabs voice. Key from gitignored .env only. No prod config changes."""

from __future__ import annotations

import json
import math
import struct
import sys
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / "backend-spring" / ".env"
OUT_DIR = ROOT / "voice-samples" / "selected-voice-tests"
VOICE_ID = "wiBTiCATMiTaXSfv8hdN"
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "pcm_24000"
SAMPLE_RATE = 24000

EN_TEXT = "Hello, I am TRON AI, your intelligent assistant."
JA_TEXT = "こんにちは。私はトロンAIです。よろしくお願いします。"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        raise SystemExit(f"Missing gitignored env file: {path}")
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def redact(msg: str, api_key: str) -> str:
    return msg.replace(api_key, "[REDACTED]") if api_key else msg


def api_request(method: str, url: str, api_key: str, body: dict | None = None, accept: str = "application/json"):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "xi-api-key": api_key,
            "Accept": accept,
            "Content-Type": "application/json",
        },
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, resp.read(), (time.perf_counter() - started) * 1000
    except urllib.error.HTTPError as err:
        return err.code, err.read(), (time.perf_counter() - started) * 1000


def summarize_json(payload: bytes) -> dict:
    try:
        return json.loads(payload.decode("utf-8"))
    except Exception:
        return {}


def wrap_pcm16_le_mono(pcm: bytes, sample_rate: int = SAMPLE_RATE) -> bytes:
    channels = 1
    bits = 16
    byte_rate = sample_rate * channels * bits // 8
    block_align = channels * bits // 8
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits,
        b"data",
        data_size,
    )
    return header + pcm


def find_pcm_start(wav: bytes) -> int:
    offset = 12
    while offset + 8 <= len(wav):
        chunk = wav[offset : offset + 4]
        size = struct.unpack_from("<I", wav, offset + 4)[0]
        if chunk == b"data":
            return offset + 8
        offset += 8 + size
    return -1


def robotic_process(wav: bytes, resonance: float = 0.18, metallic: float = 0.08) -> bytes:
    pcm_start = find_pcm_start(wav)
    if pcm_start < 0:
        return wav
    out = bytearray(wav)
    prev = 0.0
    for i in range(pcm_start, len(out) - 1, 2):
        sample = struct.unpack_from("<h", out, i)[0]
        resonant = sample * (1.0 - resonance) + prev * resonance
        shaped = resonant + metallic * math.tanh(resonant / 8000.0) * 1800.0
        shaped = max(-30000.0, min(30000.0, shaped))
        next_s = int(round(shaped))
        struct.pack_into("<h", out, i, next_s)
        prev = next_s
    return bytes(out)


def to_wav(audio: bytes) -> bytes:
    if audio[:4] == b"RIFF":
        return audio
    return wrap_pcm16_le_mono(audio, SAMPLE_RATE)


def wav_info(path: Path) -> dict:
    with wave.open(str(path), "rb") as w:
        frames = w.getnframes()
        sr = w.getframerate()
        return {
            "file": path.name,
            "duration_s": round(frames / float(sr), 2),
            "sample_rate": sr,
            "channels": w.getnchannels(),
            "bytes": path.stat().st_size,
        }


def synthesize(api_key: str, voice_id: str, text: str, model_id: str) -> tuple[int, bytes, float, str | None]:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format={OUTPUT_FORMAT}"
    body = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.75,
            "style": 0.15,
            "use_speaker_boost": True,
        },
    }
    status, payload, ms = api_request(
        "POST",
        url,
        api_key,
        body=body,
        accept="audio/wav, application/octet-stream, */*",
    )
    err = None
    if status != 200:
        err = redact(payload.decode("utf-8", errors="replace")[:500], api_key)
    return status, payload, ms, err


def main() -> int:
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY missing in gitignored .env")
        return 2

    print("=== Selected voice test ===")
    print(f"voice_id={VOICE_ID}")
    print(f"model_id={MODEL_ID}")
    print(f"output_format={OUTPUT_FORMAT}")
    print(f"key_present=yes len={len(api_key)} prefix={api_key[:3]}…")
    print("production_config_changed=false")

    # 1) Verify voice metadata access (may fail on restricted keys)
    status, body, ms = api_request("GET", f"https://api.elevenlabs.io/v1/voices/{VOICE_ID}", api_key)
    voice_meta = summarize_json(body)
    print(f"GET /v1/voices/{{id}} -> HTTP {status} in {ms:.0f} ms")
    voice_lookup_ok = status == 200
    if voice_lookup_ok:
        print(
            "Voice metadata:",
            {
                "name": voice_meta.get("name"),
                "category": voice_meta.get("category"),
                "voice_id": voice_meta.get("voice_id") or VOICE_ID,
            },
        )
    else:
        detail = voice_meta.get("detail") if isinstance(voice_meta, dict) else None
        print("Voice lookup error:", redact(json.dumps(detail or summarize_json(body), ensure_ascii=False)[:400], api_key))

    # 2) Probe TTS access with selected voice + multilingual_v2
    probe_status, probe_audio, probe_ms, probe_err = synthesize(
        api_key, VOICE_ID, "TRON AI selected voice probe.", MODEL_ID
    )
    print(f"TTS probe -> HTTP {probe_status} in {probe_ms:.0f} ms, bytes={len(probe_audio)}")
    if probe_status != 200:
        print("TTS ACCESS FAILURE:", probe_err)
        # Classify common paid-plan restrictions without exposing secrets
        lowered = (probe_err or "").lower()
        if "paid_plan_required" in lowered or "payment_required" in lowered:
            print("RESTRICTION: paid plan required for this voice via API")
        elif "missing_permissions" in lowered or "unauthorized" in lowered:
            print("RESTRICTION: API key missing required TTS/voice permissions")
        elif "quota" in lowered or "limit" in lowered:
            print("RESTRICTION: quota/limit related failure")
        report = {
            "voice_id": VOICE_ID,
            "model_id": MODEL_ID,
            "voice_lookup_http": status,
            "tts_probe_http": probe_status,
            "tts_probe_error": probe_err,
            "samples_generated": False,
            "production_config_changed": False,
        }
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "test-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache: dict[str, bytes] = {}
    synth_stats = []

    jobs = [
        ("tron-english-original.wav", EN_TEXT, "en", False),
        ("tron-english-robotic.wav", EN_TEXT, "en", True),
        ("tron-japanese-original.wav", JA_TEXT, "ja", False),
        ("tron-japanese-robotic.wav", JA_TEXT, "ja", True),
    ]

    for filename, text, lang, robotic in jobs:
        if lang not in cache:
            print(f"Synthesizing {lang} ({len(text)} chars) with selected voice…")
            st, audio, latency, err = synthesize(api_key, VOICE_ID, text, MODEL_ID)
            print(f"TTS {lang} -> HTTP {st} in {latency:.0f} ms, bytes={len(audio)}")
            if st != 200:
                print("TTS FAILURE:", err)
                return 1
            wav = to_wav(audio)
            if wav[:4] != b"RIFF":
                print("WAV wrap failed")
                return 1
            cache[lang] = wav
            synth_stats.append(
                {
                    "lang": lang,
                    "chars": len(text),
                    "latency_ms": round(latency),
                    "pcm_bytes": len(audio),
                    "wav_bytes": len(wav),
                    "text": text,
                }
            )
        out_bytes = robotic_process(cache[lang]) if robotic else cache[lang]
        path = OUT_DIR / filename
        path.write_bytes(out_bytes)
        print(f"Wrote {path.name} ({len(out_bytes)} bytes) robotic={robotic}")

    files = [wav_info(OUT_DIR / name) for name, *_ in jobs]
    report = {
        "voice_id": VOICE_ID,
        "voice_name": voice_meta.get("name") if voice_lookup_ok else None,
        "voice_category": voice_meta.get("category") if voice_lookup_ok else None,
        "voice_lookup_http": status,
        "voice_lookup_ok": voice_lookup_ok,
        "model_id": MODEL_ID,
        "output_format": OUTPUT_FORMAT,
        "tts_probe_http": probe_status,
        "tts_probe_latency_ms": round(probe_ms),
        "synthesis": synth_stats,
        "files": files,
        "en_original_differs_from_robotic": (OUT_DIR / "tron-english-original.wav").read_bytes()
        != (OUT_DIR / "tron-english-robotic.wav").read_bytes(),
        "ja_original_differs_from_robotic": (OUT_DIR / "tron-japanese-original.wav").read_bytes()
        != (OUT_DIR / "tron-japanese-robotic.wav").read_bytes(),
        "samples_generated": True,
        "production_config_changed": False,
    }
    (OUT_DIR / "test-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print("=== DONE ===")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
