"""Run the archived Supertonic server with pinned local Supertonic 3 M5 assets."""

import argparse
from pathlib import Path

MODEL = "supertonic-3"
MODEL_REPO = "supertone-oss-archive/supertonic-3"
MODEL_REVISION = "aafc6e32416a594460b32413efc49d7fe4ce6d46"
DEFAULT_MODEL_DIR = Path(__file__).resolve().parents[1] / ".runtime" / "supertonic-3"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--port", type=int, default=7788)
    parser.add_argument("--download", action="store_true", help="Download pinned public model assets and exit")
    args = parser.parse_args()

    if args.download:
        from huggingface_hub import snapshot_download

        snapshot_download(
            MODEL_REPO, revision=MODEL_REVISION, local_dir=args.model_dir,
            allow_patterns=["LICENSE", "onnx/*", "voice_styles/M5.json"], token=False,
        )
        return

    if not (args.model_dir / "voice_styles" / "M5.json").is_file():
        parser.error("M5 assets are missing; run with --download first or pass --model-dir.")

    import uvicorn
    from supertonic import TTS
    from supertonic.server import ServerState, create_app

    tts = TTS(model=MODEL, model_dir=args.model_dir, auto_download=False)
    state = ServerState(model=MODEL, tts=tts, custom_styles_dir=args.model_dir / "custom_styles")
    uvicorn.run(create_app(state=state), host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
