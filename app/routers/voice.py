from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.whisper_service import transcribe_audio, _WHISPER_AVAILABLE

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default="te"),
):
    if not _WHISPER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Local Whisper model is not installed on this server. Use /api/assemblyai for cloud transcription.",
        )
    audio_bytes = await file.read()
    try:
        return await transcribe_audio(audio_bytes, language=language)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))