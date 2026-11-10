# Selected voice test — `wiBTiCATMiTaXSfv8hdN`

**Result: TTS blocked for this API key / plan.**

ElevenLabs returned:

- `free_users_not_allowed`
- Message: *You need to be on the creator tier or above to use this voice.*

Also:

- Voice metadata lookup failed: key missing `voices_read`
- No WAV samples were generated (access denied before synthesis)

Production voice configuration was **not** changed.

To complete this test later:

1. Upgrade the ElevenLabs account to **Creator** (or higher), **or**
2. Use an API key from an account that already owns/has Creator access to this voice, then re-run:

```bash
python tools/selected_voice_test.py
```

Expected outputs after access is granted:

- `tron-english-original.wav`
- `tron-english-robotic.wav`
- `tron-japanese-original.wav`
- `tron-japanese-robotic.wav`
