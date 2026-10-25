"""
Shared Gemini text → JSON helper.
Keeps the API key server-side so it never ships inside the web bundle / APK.
"""
import json
import re

import httpx
from fastapi import HTTPException

from app.core.config import settings

_TEXT_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
]


async def gemini_json(prompt: str, max_tokens: int = 512) -> dict:
    """Send a prompt, return the first JSON object in the reply. Raises HTTPException on failure."""
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="AI parsing not configured on this server")

    last_err = None
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": max_tokens},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in _TEXT_MODELS:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={settings.gemini_api_key}"
            )
            try:
                res = await client.post(url, json=payload)
            except httpx.HTTPError as e:
                last_err = str(e)
                continue
            if res.status_code in (404, 429):
                # Model not available for this key, or quota hit — try next
                last_err = f"Gemini {res.status_code}"
                continue
            if not res.is_success:
                last_err = res.json().get("error", {}).get("message", "Gemini error")
                continue
            raw = res.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            m = re.search(r"\{[\s\S]*\}", raw)
            if not m:
                raise HTTPException(status_code=502, detail="Gemini returned no JSON")
            try:
                return json.loads(m.group())
            except ValueError:
                raise HTTPException(status_code=502, detail="Gemini returned invalid JSON")

    raise HTTPException(status_code=503, detail=last_err or "AI parsing failed")
