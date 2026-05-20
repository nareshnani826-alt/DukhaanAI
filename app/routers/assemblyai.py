import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings

router = APIRouter(prefix="/aai", tags=["assemblyai"])


@router.get("/token")
async def get_realtime_token():
    """Return a short-lived AssemblyAI token for client-side real-time transcription.
    The real API key never leaves the server."""
    if not settings.assemblyai_api_key:
        raise HTTPException(status_code=503, detail="Speech-to-text not configured. Add ASSEMBLYAI_API_KEY.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.assemblyai.com/v2/realtime/token",
                headers={"Authorization": settings.assemblyai_api_key},
                json={"expires_in": 60},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=503, detail="Could not get speech token. Check ASSEMBLYAI_API_KEY.")
        return resp.json()  # {"token": "..."}
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="Speech service timeout. Try again.")
