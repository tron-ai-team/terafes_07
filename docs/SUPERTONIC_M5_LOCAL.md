# Supertonic 3 M5 for local TRON AI

M5 is the same speaker for English and Japanese. The local worker synthesizes PCM WAV on CPU with the [archived Supertonic SDK](https://github.com/supertone-oss-archive/supertonic-py) and the [pinned Supertonic 3 weights](https://huggingface.co/supertone-oss-archive/supertonic-3). The model's [OpenRAIL-M license](https://huggingface.co/supertone-oss-archive/supertonic-3/blob/main/LICENSE) applies. After setup, synthesis uses localhost only and needs no provider account, API key, or billing.

From the repository root in PowerShell (Python 3.12 and Git):

```powershell
python -m venv .runtime/supertonic-venv
$m5Python = '.\.runtime\supertonic-venv\Scripts\python.exe'
& $m5Python -m pip install 'supertonic[serve] @ git+https://github.com/supertone-oss-archive/supertonic-py.git@df0f9686dac7fbbde391b759e2ee5286a3737622'
& $m5Python tools/supertonic_m5.py --download
& $m5Python tools/supertonic_m5.py
```

The download is about 400 MB and is stored under the ignored `.runtime/` directory. If you already have the pinned model assets, skip the download and use `--model-dir PATH` on the final command. Leave the worker running, then set the following in the shell that starts your **local** Spring backend (use the `local` profile):

```powershell
$env:TTS_SUPERTONIC_ENABLED = 'true'
.\START_TRON.cmd
```

Run the start command from this checkout. If its Spring backend is already running, restart it so it inherits the opt-in.

The default worker address is `127.0.0.1:7788`. If needed, change the worker's `--port` and set the same `TTS_SUPERTONIC_PORT` in the Spring shell. `TTS_SUPERTONIC_TIMEOUT_SECONDS` defaults to 15. To check the worker, open [localhost:7788/v1/health](http://127.0.0.1:7788/v1/health).

Start a voice conversation in English or Japanese. A successful voice turn reports `ttsProvider: supertonic-m5`, and the UI plays the existing WAV response. M5 uses its original timbre. The backend adjusts the spelling of “TRON AI” for English synthesis and spells standalone “AI” as “エーアイ” for Japanese synthesis; display text is unchanged. If M5 can't synthesize a turn, Voice Mode uses browser speech without calling a cloud TTS provider. Removing the opt-in and restarting Spring restores the preexisting routing.
