import sys
import os
import certifi
from transformers import pipeline

# Fix SSL
os.environ['SSL_CERT_FILE'] = certifi.where()

audio_path = sys.argv[1]

pipe = pipeline("automatic-speech-recognition", model="openai/whisper-base")

# 🔥 FIX HERE
result = pipe(audio_path, return_timestamps=True)

print(result["text"])