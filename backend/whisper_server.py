"""
AetherVault Whisper Server — persistent transcription service.
Loads openai/whisper-base once at startup instead of re-loading per request.
Port: 5003 (controlled by WHISPER_PORT env var)

Start : python whisper_server.py
Requires: pip install flask transformers torch requests
          ffmpeg must be in PATH — run: conda install -c conda-forge ffmpeg
"""

import os
import sys
import re
import tempfile
import subprocess
import requests
from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)
_pipe = None


def get_pipe():
    global _pipe
    if _pipe is None:
        print("Loading openai/whisper-base...", file=sys.stderr, flush=True)
        _pipe = pipeline("automatic-speech-recognition", model="openai/whisper-base")
        print("Whisper ready.", file=sys.stderr, flush=True)
    return _pipe


def download_audio(url: str) -> str:
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp.write(resp.content)
    tmp.close()
    return tmp.name


def convert_to_wav(input_path: str) -> str:
    output_path = input_path.rsplit(".", 1)[0] + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", "-f", "wav", output_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return output_path


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    url = request.get_json(force=True).get("url", "")
    if not url:
        return jsonify({"error": "url is required"}), 400

    input_path = None
    wav_path = None

    try:
        input_path = download_audio(url)
        wav_path = convert_to_wav(input_path)

        result = get_pipe()(wav_path, return_timestamps=True)
        text = result["text"] or ""
        text = re.sub(r"\[.*?\]", "", text).strip()

        return jsonify({"text": text})

    except Exception as e:
        print(f"[whisper] error: {e}", file=sys.stderr, flush=True)
        return jsonify({"error": str(e)}), 500

    finally:
        for path in [input_path, wav_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass


if __name__ == "__main__":
    port = int(os.environ.get("WHISPER_PORT", 5003))
    get_pipe()  # pre-load at startup so first request is instant
    app.run(host="0.0.0.0", port=port)
