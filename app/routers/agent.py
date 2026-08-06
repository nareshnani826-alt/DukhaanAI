import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from groq import AsyncGroq

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.routers.insights import reorder_suggestions, margin_alerts, dead_stock

router = APIRouter(prefix="/agent", tags=["agent"])
logger = logging.getLogger(__name__)

_GROQ_MODEL = "llama-3.3-70b-versatile"
_VALID_KINDS = ("reorder", "festival_prep", "margin", "dead_stock")
_VALID_URGENCY = ("critical", "high", "medium")

_SYSTEM_PROMPT = """You are an inventory operations analyst for an Indian kirana (grocery) store.
You receive raw signals: reorder needs (with any upcoming festival demand boost already applied),
margin alerts, and dead stock. Your job is to CORRELATE these signals into a short, prioritized
list a busy shop owner should see first thing in the morning — not just repeat the raw data.

Rules:
- Only surface signals worth a human's attention. Skip anything minor.
- If festival_boost_applied is true on a reorder item, treat it as higher priority and say why
  in plain language (which festival, how many days away).
- Each suggestion must describe ONE concrete action in plain, simple English, about ONE product.
- "product_name" is REQUIRED on every suggestion and MUST be copied EXACTLY
  (character-for-character, same spelling/case) from the "name" field of the specific item in the
  input data that this suggestion is about. Do not paraphrase, shorten, or translate it.
- Output STRICT JSON only, matching this exact shape:
{"suggestions": [{"kind": "reorder", "product_name": "Maggi Noodles", "title": "Reorder Maggi Noodles before it runs out", "summary": "Only 8 packs left and selling fast — will run out in 2 days.", "reasoning": "current_stock=8, daily_rate=4.2, days_of_stock_left=1.9", "urgency": "critical"}]}
- "kind" must be one of: reorder, festival_prep, margin, dead_stock.
- Return at most 8 suggestions, most important first. If nothing is worth flagging, return {"suggestions": []}.
- Never invent numbers that are not present in the input data."""


async def _gather_signals(vendor: dict) -> dict:
    """Pull the existing insights endpoints directly (no HTTP round-trip) as the agent's raw signals."""
    reorder_data = await reorder_suggestions(days_cover=7, vendor=vendor)
    margin_data  = await margin_alerts(threshold=10.0, vendor=vendor)
    dead_data    = await dead_stock(days=30, vendor=vendor)
    return {
        "reorder": reorder_data,
        "margin_alerts": margin_data,
        "dead_stock": dead_data,
    }


async def _correlate_with_llm(signals: dict) -> list[dict]:
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="AI not configured. Add GROQ_API_KEY to server environment.")

    client = AsyncGroq(api_key=settings.groq_api_key, timeout=25.0)
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(signals, default=str)},
    ]
    try:
        response = await client.chat.completions.create(
            model=_GROQ_MODEL, messages=messages,
            response_format={"type": "json_object"}, max_tokens=1500, temperature=0.2,
        )
    except Exception as e:
        logger.error("agent: Groq call failed: %s", e)
        raise HTTPException(status_code=502, detail="AI provider error — try again shortly.")

    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("agent: failed to parse LLM JSON output: %s", raw[:200])
        return []

    items = parsed.get("suggestions", [])
    return [
        it for it in items
        if isinstance(it, dict) and it.get("kind") in _VALID_KINDS and it.get("title")
    ]


def _find_item(candidates: list[dict], name: str | None, haystack: str) -> dict | None:
    """Find the signal item this suggestion is about: prefer an exact (case-insensitive) match
    on the LLM's claimed product_name, else fall back to scanning the suggestion's own text for
    a known product name — the LLM sometimes drops the explicit field but nearly always mentions
    the product by name in the title/summary. Picks the longest match to avoid short false hits.
    """
    if name:
        low = name.strip().lower()
        exact = next((it for it in candidates if (it.get("name") or "").strip().lower() == low), None)
        if exact:
            return exact

    haystack_low = haystack.lower()
    found = [it for it in candidates if it.get("name") and it["name"].lower() in haystack_low]
    if not found:
        return None
    return max(found, key=lambda it: len(it["name"]))


def _ground_suggestion(s: dict, signals: dict) -> dict:
    """Attach real product data (id/qty/unit) by matching this suggestion back to the original
    signal item it was derived from — never trust IDs or numbers the LLM produced directly.
    """
    haystack = f"{s.get('title', '')} {s.get('summary', '')}"
    name = s.get("product_name")

    if s["kind"] in ("reorder", "festival_prep"):
        match = _find_item(signals["reorder"].get("items", []), name, haystack)
        if match:
            s["product_name"]  = match["name"]
            s["suggested_qty"] = match.get("suggested_order_qty")
            s["unit"]          = match.get("unit", "")
    elif s["kind"] == "margin":
        match = _find_item(signals["margin_alerts"].get("items", []), name, haystack)
        if match:
            s["product_name"] = match["name"]
            s["product_id"]   = match.get("id")
    elif s["kind"] == "dead_stock":
        match = _find_item(signals["dead_stock"].get("items", []), name, haystack)
        if match:
            s["product_name"] = match["name"]
            s["product_id"]   = match.get("id")
    return s


@router.post("/run")
async def run_agent(vendor=Depends(get_current_vendor)):
    """Gather live store signals, ask the LLM to correlate them, persist new pending suggestions.

    Read-only over store data; only ever writes to agent_suggestions, never to
    products/stock/orders — the vendor must explicitly approve a suggestion before
    acting on it elsewhere in the app.
    """
    db = get_db()
    signals = await _gather_signals(vendor)
    suggestions = await _correlate_with_llm(signals)

    existing = (
        db.table("agent_suggestions").select("kind,title")
        .eq("vendor_id", vendor["id"]).eq("status", "pending")
        .execute().data or []
    )
    existing_keys = {(e["kind"], e["title"]) for e in existing}

    created = []
    for s in suggestions:
        key = (s["kind"], s["title"])
        if key in existing_keys:
            continue
        s = _ground_suggestion(s, signals)
        urgency = s.get("urgency") if s.get("urgency") in _VALID_URGENCY else "medium"
        row = db.table("agent_suggestions").insert({
            "vendor_id": vendor["id"],
            "kind": s["kind"],
            "title": s["title"][:200],
            "summary": (s.get("summary") or "")[:1000],
            "reasoning": (s.get("reasoning") or "")[:1000],
            "urgency": urgency,
            "payload": s,
        }).execute().data
        if row:
            created.append(row[0])
        existing_keys.add(key)

    return {
        "created": created,
        "created_count": len(created),
        "signals_reviewed": {
            "reorder_items":   signals["reorder"].get("count", 0),
            "margin_alerts":   signals["margin_alerts"].get("count", 0),
            "dead_stock_items": signals["dead_stock"].get("count", 0),
        },
    }


@router.get("/suggestions")
async def list_suggestions(
    status: str = Query("pending"),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    q = db.table("agent_suggestions").select("*").eq("vendor_id", vendor["id"])
    if status != "all":
        q = q.eq("status", status)
    return q.order("created_at", desc=True).limit(50).execute().data or []


def _resolve(suggestion_id: str, vendor_id: str, new_status: str) -> dict:
    db = get_db()
    existing = (
        db.table("agent_suggestions").select("id")
        .eq("id", suggestion_id).eq("vendor_id", vendor_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    updated = db.table("agent_suggestions").update({
        "status": new_status,
        "resolved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", suggestion_id).execute().data
    return updated[0]


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_suggestion(suggestion_id: str, vendor=Depends(get_current_vendor)):
    return _resolve(suggestion_id, vendor["id"], "approved")


@router.post("/suggestions/{suggestion_id}/dismiss")
async def dismiss_suggestion(suggestion_id: str, vendor=Depends(get_current_vendor)):
    return _resolve(suggestion_id, vendor["id"], "dismissed")
