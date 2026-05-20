from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from app.services.whisper_service import transcribe_audio

router = APIRouter()

@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Form(default="te"),
):
    audio_bytes = await file.read()
    result = await transcribe_audio(audio_bytes, language=language)
    return result