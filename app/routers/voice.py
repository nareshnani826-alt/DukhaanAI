import re
from typing import Optional

import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import Response

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

# ── Spoken alerts in Indian languages ──────────────────────────────
# Most computers have no Telugu/Tamil/… voice, and browsers are often refused
# when they call Google's speech service directly. The server fetches it instead
# and joins the sentences into one MP3, so the whole alert is read out.
TTS_LANGS = {"te", "hi", "ta", "kn", "ml", "mr", "bn", "gu", "pa", "en"}


def _tts_chunks(text: str, max_len: int = 180) -> list[str]:
    chunks, cur = [], ""
    for part in re.split(r"(?<=[।.!?])\s+", text.strip()):
        while len(part) > max_len:             # one very long sentence: cut at a space
            cut = part.rfind(" ", 0, max_len)
            if cut <= 0:
                cut = max_len
            chunks.append(part[:cut])
            part = part[cut:].strip()
        if cur and len(cur) + 1 + len(part) > max_len:
            chunks.append(cur); cur = part
        else:
            cur = f"{cur} {part}".strip()
    if cur:
        chunks.append(cur)
    return chunks


@router.get("/tts")
async def tts(text: str = Query(..., min_length=1, max_length=1500), lang: str = Query("te")):
    lang = lang.split("-")[0].lower()
    if lang not in TTS_LANGS:
        raise HTTPException(status_code=400, detail="Language not supported")
    audio = b""
    async with httpx.AsyncClient(timeout=10) as client:
        for chunk in _tts_chunks(text):
            r = await client.get("https://translate.google.com/translate_tts",
                                 params={"ie": "UTF-8", "q": chunk, "tl": lang, "client": "tw-ob", "ttsspeed": "0.85"},
                                 headers={"User-Agent": "Mozilla/5.0"})
            if r.status_code != 200 or not r.headers.get("content-type", "").startswith("audio"):
                raise HTTPException(status_code=502, detail="Voice service unavailable")
            audio += r.content
    return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
