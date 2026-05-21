import tempfile
import os

try:
    import whisper as _whisper
    _model = _whisper.load_model("tiny")
    _WHISPER_AVAILABLE = True
except ImportError:
    _whisper = None
    _model = None
    _WHISPER_AVAILABLE = False


async def transcribe_audio(audio_bytes: bytes, language: str = "te"):
    if not _WHISPER_AVAILABLE:
        raise RuntimeError(
            "Local Whisper model is not installed. "
            "Use the /api/assemblyai endpoint for cloud transcription."
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = _model.transcribe(tmp_path, fp16=False, language=language)
        return {
            "text": result["text"].strip(),
            "language": result.get("language", "unknown"),
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)