#!/usr/bin/env python3
"""Generate real ElevenLabs EN/JA TRON voice samples. Key loaded from gitignored .env only."""

from __future__ import annotations

import json
import math
import os
import struct
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / "backend-spring" / ".env"
OUT_DIR = ROOT / "voice-samples" / "elevenlabs-tests"
VOICE_ID = "Nagtyt9MktF8AWSgjotJ"
MODEL_ID = "eleven_multilingual_v2"
OUTPUT_FORMAT = "pcm_24000"
SAMPLE_RATE = 24000

EN_TEXT = "Hello, I am TRON AI, your intelligent assistant. How may I help you today?"
JA_TEXT = "こんにちは。私はトロンAIです。今日はどのようなご用件でしょうか。"


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
    if not api_key:
        return msg
    return msg.replace(api_key, "[REDACTED]")


def api_request(
    method: str,
    url: str,
    api_key: str,
    body: dict | None = None,
    accept: str = "application/json",
) -> tuple[int, bytes, float]:
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = resp.read()
            return resp.status, payload, (time.perf_counter() - started) * 1000
    except urllib.error.HTTPError as err:
        payload = err.read()
        return err.code, payload, (time.perf_counter() - started) * 1000


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


def summarize_json(payload: bytes) -> dict:
    try:
        return json.loads(payload.decode("utf-8"))
    except Exception:
        return {}


def main() -> int:
    env = load_env(ENV_PATH)
    api_key = env.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = env.get("TTS_ELEVENLABS_VOICE_ID", VOICE_ID).strip() or VOICE_ID
    model_id = env.get("TTS_ELEVENLABS_MODEL_ID", MODEL_ID).strip() or MODEL_ID
    output_format = env.get("TTS_ELEVENLABS_OUTPUT_FORMAT", OUTPUT_FORMAT).strip() or OUTPUT_FORMAT

    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY missing in gitignored .env")
        return 2
    if len(api_key) < 12:
        print("ERROR: API key looks invalid (too short)")
        return 2

    print("=== ElevenLabs API verification ===")
    print(f"Key present: yes (len={len(api_key)}, prefix={api_key[:3]}…)")
    print(f"Configured voice_id: {voice_id}")
    print(f"Configured model_id: {model_id}")
    print(f"Output format: {output_format}")

    # 1) User / subscription (optional — some restricted keys lack user_read)
    status, body, ms = api_request("GET", "https://api.elevenlabs.io/v1/user", api_key)
    user = summarize_json(body)
    print(f"GET /v1/user -> HTTP {status} in {ms:.0f} ms")
    sub: dict = {}
    remaining = None
    if status == 200:
        sub = user.get("subscription") or {}
        print(
            "Subscription:",
            {
                "tier": sub.get("tier"),
                "status": sub.get("status"),
                "character_count": sub.get("character_count"),
                "character_limit": sub.get("character_limit"),
            },
        )
        if sub.get("character_limit") is not None and sub.get("character_count") is not None:
            remaining = int(sub["character_limit"]) - int(sub["character_count"])
            print(f"Characters remaining (approx): {remaining}")
            if remaining <= 0:
                print("LIMITATION: character quota exhausted — cannot generate speech")
                return 1
    else:
        detail = summarize_json(body).get("detail") or {}
        code = detail.get("code") if isinstance(detail, dict) else None
        print(
            "LIMITATION: /v1/user unavailable "
            f"(code={code or status}). Continuing with TTS-only permissions."
        )

    # 2) Models (optional)
    status, body, ms = api_request("GET", "https://api.elevenlabs.io/v1/models", api_key)
    models = summarize_json(body)
    print(f"GET /v1/models -> HTTP {status} in {ms:.0f} ms")
    model_list = models if isinstance(models, list) else []
    tts_models = []
    selected = None
    if status == 200:
        for m in model_list:
            if not isinstance(m, dict):
                continue
            if m.get("can_do_text_to_speech"):
                tts_models.append(
                    {
                        "model_id": m.get("model_id"),
                        "name": m.get("name"),
                        "languages": len(m.get("languages") or []),
                    }
                )
        print(f"TTS-capable models available: {len(tts_models)}")
        selected = next((m for m in tts_models if m.get("model_id") == model_id), None)
        if selected is None:
            for preferred in (
                "eleven_multilingual_v2",
                "eleven_turbo_v2_5",
                "eleven_flash_v2_5",
                "eleven_v3",
            ):
                selected = next((m for m in tts_models if m.get("model_id") == preferred), None)
                if selected:
                    model_id = preferred
                    break
            if selected is None and tts_models:
                model_id = tts_models[0]["model_id"]
                selected = tts_models[0]
        print(f"Selected model: {selected}")
        model_meta = next((m for m in model_list if m.get("model_id") == model_id), {})
        langs = [
            ((x.get("language_id") or x.get("iso_code") or "").lower())
            for x in (model_meta.get("languages") or [])
        ]
        if langs:
            print(f"Model language codes include en={('en' in langs)} ja={('ja' in langs)} (listed={len(langs)})")
        else:
            print("Model language list empty in metadata; will verify by synthesis")
    else:
        detail = summarize_json(body).get("detail") or {}
        print(
            "LIMITATION: /v1/models unavailable "
            f"(code={(detail.get('code') if isinstance(detail, dict) else status)}). "
            f"Using configured model_id={model_id}"
        )
        selected = {"model_id": model_id, "name": model_id, "languages": "unknown"}

    # 3) Voice exists (optional list; TTS itself is authoritative)
    status, body, ms = api_request("GET", f"https://api.elevenlabs.io/v1/voices/{voice_id}", api_key)
    print(f"GET /v1/voices/{{id}} -> HTTP {status} in {ms:.0f} ms")
    voice = summarize_json(body)
    if status != 200:
        print(
            "VOICE LOOKUP LIMITED:",
            redact(body.decode("utf-8", errors="replace")[:300], api_key),
        )
        status2, body2, _ = api_request("GET", "https://api.elevenlabs.io/v1/voices", api_key)
        voices_payload = summarize_json(body2)
        voices = voices_payload.get("voices") if isinstance(voices_payload, dict) else []
        print(f"GET /v1/voices -> HTTP {status2}; count={len(voices) if isinstance(voices, list) else 0}")
        if isinstance(voices, list) and voices:
            pick = None
            for v in voices:
                name = (v.get("name") or "").lower()
                if any(tok in name for tok in ("danny", "robot", "deep", "adam", "clyde", "george")):
                    pick = v
                    break
            if pick is None:
                pick = voices[0]
            voice_id = pick.get("voice_id")
            voice = pick
            print(f"Fallback voice selected: name={pick.get('name')} id={voice_id}")
        else:
            voice = {"name": "unknown-will-verify-via-tts", "voice_id": voice_id}
            print(f"Proceeding with configured voice_id={voice_id} (list permission missing)")
    else:
        print(f"Voice OK: name={voice.get('name')} category={voice.get('category')}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Free plans cannot use community/library voices via API. Prefer deep male premades.
    candidate_voices: list[tuple[str, str]] = [
        (voice_id, voice.get("name") or "configured"),
        ("pNInz6obpgDQGcFmaJgB", "Adam"),
        ("VR6AewLTigWG4xSOukaG", "Arnold"),
        ("TxGEqnHWrfWFTfGW9XjX", "Josh"),
        ("ErXwobaYiN019PkySvjV", "Antoni"),
        ("21m00Tcm4TlvDq8ikWAM", "Rachel"),
        ("EXAVITQu4vr4xnSDxMaL", "Bella"),
    ]
    # De-dupe while preserving order
    seen_ids: set[str] = set()
    unique_candidates: list[tuple[str, str]] = []
    for cid, cname in candidate_voices:
        if cid and cid not in seen_ids:
            seen_ids.add(cid)
            unique_candidates.append((cid, cname))

    probe_text = "TRON AI voice probe."
    working_voice_id = None
    working_voice_name = None
    probe_error = None
    for cid, cname in unique_candidates:
        print(f"Probing TTS voice candidate name={cname} id={cid}…")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{cid}?output_format={output_format}"
        status, audio, ms = api_request(
            "POST",
            url,
            api_key,
            body={
                "text": probe_text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": 0.55,
                    "similarity_boost": 0.75,
                    "style": 0.15,
                    "use_speaker_boost": True,
                },
            },
            accept="audio/wav, application/octet-stream, */*",
        )
        print(f"  probe -> HTTP {status} in {ms:.0f} ms, bytes={len(audio)}")
        if status == 200 and len(audio) > 1000:
            working_voice_id = cid
            working_voice_name = cname
            break
        probe_error = redact(audio.decode("utf-8", errors="replace")[:400], api_key)
        # If model itself is rejected, try turbo/flash once
        if status == 400 and "model" in probe_error.lower():
            for alt_model in ("eleven_turbo_v2_5", "eleven_flash_v2_5", "eleven_multilingual_v2"):
                if alt_model == model_id:
                    continue
                print(f"  retrying with model={alt_model}")
                status2, audio2, ms2 = api_request(
                    "POST",
                    f"https://api.elevenlabs.io/v1/text-to-speech/{cid}?output_format={output_format}",
                    api_key,
                    body={"text": probe_text, "model_id": alt_model},
                    accept="audio/wav, application/octet-stream, */*",
                )
                print(f"  probe model={alt_model} -> HTTP {status2} in {ms2:.0f} ms, bytes={len(audio2)}")
                if status2 == 200 and len(audio2) > 1000:
                    model_id = alt_model
                    working_voice_id = cid
                    working_voice_name = cname
                    break
            if working_voice_id:
                break

    if not working_voice_id:
        print("LIMITATION: no usable TTS voice for this API key.")
        print("Last error:", probe_error)
        print(
            "Likely cause: free-plan keys cannot use Voice Library voices via API; "
            "upgrade plan or create/use an owned/default voice."
        )
        return 1

    voice_id = working_voice_id
    voice = {"name": working_voice_name, "voice_id": voice_id}
    print(f"Using voice name={working_voice_name} id={voice_id} model={model_id}")

    jobs = [
        ("tron-english-original.wav", EN_TEXT, False),
        ("tron-english-robotic.wav", EN_TEXT, True),
        ("tron-japanese-original.wav", JA_TEXT, False),
        ("tron-japanese-robotic.wav", JA_TEXT, True),
    ]

    # Reuse one EN and one JA synthesis to avoid double billing for original+robotic
    cache: dict[str, bytes] = {}
    results = []

    for filename, text, robotic in jobs:
        lang_key = "en" if text == EN_TEXT else "ja"
        if lang_key not in cache:
            print(f"Synthesizing {lang_key} ({len(text)} chars)…")
            url = (
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                f"?output_format={output_format}"
            )
            body_obj = {
                "text": text,
                "model_id": model_id,
                "voice_settings": {
                    "stability": 0.55,
                    "similarity_boost": 0.75,
                    "style": 0.15,
                    "use_speaker_boost": True,
                },
            }
            status, audio, ms = api_request(
                "POST",
                url,
                api_key,
                body=body_obj,
                accept="audio/wav, application/octet-stream, */*",
            )
            print(f"TTS {lang_key} -> HTTP {status} in {ms:.0f} ms, bytes={len(audio)}")
            if status != 200:
                print("TTS FAILURE:", redact(audio.decode("utf-8", errors="replace")[:500], api_key))
                return 1
            if audio[:4] == b"RIFF":
                wav = audio
            else:
                # pcm_* formats are raw PCM
                if not output_format.startswith("pcm_") and not output_format.startswith("wav_"):
                    print(f"Unexpected non-PCM payload for format={output_format}")
                    return 1
                wav = wrap_pcm16_le_mono(audio, SAMPLE_RATE)
            if wav[:4] != b"RIFF":
                print("WAV wrap failed")
                return 1
            cache[lang_key] = wav
            results.append({"lang": lang_key, "latency_ms": round(ms), "bytes": len(wav), "chars": len(text)})
        else:
            wav = cache[lang_key]

        out_bytes = robotic_process(wav) if robotic else wav
        path = OUT_DIR / filename
        path.write_bytes(out_bytes)
        print(f"Wrote {path.name} ({len(out_bytes)} bytes) robotic={robotic}")

    report = {
        "model_id": model_id,
        "voice_id": voice_id,
        "voice_name": voice.get("name"),
        "output_format": output_format,
        "subscription_tier": sub.get("tier"),
        "character_count": sub.get("character_count"),
        "character_limit": sub.get("character_limit"),
        "approx_remaining": remaining,
        "synthesis": results,
        "files": [p.name for p in sorted(OUT_DIR.glob("tron-*.wav"))],
    }
    (OUT_DIR / "test-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("=== DONE ===")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
