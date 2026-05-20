import whisper
import tempfile
import os

# Load model once during startup
model = whisper.load_model("tiny")

async def transcribe_audio(audio_bytes: bytes, language: str = "te"):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        temp_audio.write(audio_bytes)
        temp_audio_path = temp_audio.name

    try:
        result = model.transcribe(
            temp_audio_path,
            fp16=False,
            language=language,
        )

        return {
            "text": result["text"].strip(),
            "language": result.get("language", "unknown")
        }

    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)