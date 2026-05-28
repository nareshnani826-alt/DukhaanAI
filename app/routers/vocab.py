"""
Global Vocabulary router — shared alias learning across ALL users.
When one user teaches "పాలు" = Milk, every user benefits.
"""
import logging
from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.security import decode_access_token
from app.core.database import get_db

router = APIRouter(prefix="/vocab", tags=["vocab"])
logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)


def _optional_vendor(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> Optional[str]:
    """Returns vendor_id if token present and valid, else None (anonymous allowed)."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        return payload.get("sub")
    except Exception:
        return None


# ── Schemas ───────────────────────────────────────────────────

class TeachPayload(BaseModel):
    term:         str = Field(..., min_length=1, max_length=120)
    product_name: str = Field(..., min_length=1, max_length=200)
    lang:         str = Field("te-IN",   max_length=10)
    store_type:   str = Field("kirana",  max_length=20)
    auto_learned: bool = False   # True = auto-detect, lower confidence


class LookupPayload(BaseModel):
    terms:      List[str] = Field(..., max_length=50)  # up to 50 terms per batch
    store_type: str       = Field("kirana", max_length=20)


# ── Endpoints ─────────────────────────────────────────────────

@router.post("/lookup")
async def lookup_vocab(body: LookupPayload):
    """
    Look up multiple terms in the global shared vocab.
    No auth required — read is public.
    Returns only high-confidence entries (confidence >= 2) to avoid noise.
    """
    if not body.terms:
        return []

    # Normalise terms
    terms = [t.lower().strip()[:120] for t in body.terms if t.strip()]
    if not terms:
        return []

    db = get_db()
    try:
        rows = (
            db.table("global_vocab")
            .select("term,product_name,lang,hits,confidence")
            .in_("term", terms)
            .eq("store_type", body.store_type)
            .gte("confidence", 2)          # only show confirmed entries
            .order("confidence", desc=True)
            .execute()
        ).data or []
        return rows
    except Exception as e:
        logger.error("vocab lookup error: %s", e)
        return []


@router.post("/teach")
async def teach_vocab(
    body: TeachPayload,
    vendor_id: Optional[str] = Depends(_optional_vendor),
):
    """
    Submit a term → product mapping.
    Manual teaches get confidence=10; auto-learned get confidence=1.
    If the same term already exists: increment hits + update confidence.
    """
    term         = body.term.lower().strip()[:120]
    product_name = body.product_name.strip()[:200]
    confidence   = 1 if body.auto_learned else 10
    store_type   = body.store_type

    if not term or not product_name:
        return {"ok": False, "reason": "empty term or product_name"}

    db = get_db()
    try:
        existing = (
            db.table("global_vocab")
            .select("id,hits,confidence")
            .eq("term", term)
            .eq("store_type", store_type)
            .maybe_single()
            .execute()
        ).data

        if existing:
            # Already known: bump hits and upgrade confidence if manual
            new_confidence = max(existing["confidence"], confidence)
            db.table("global_vocab").update({
                "hits":         existing["hits"] + 1,
                "confidence":   new_confidence,
                "product_name": product_name,   # allow correction
                "updated_at":   "now()",
            }).eq("id", existing["id"]).execute()
            action = "updated"
        else:
            db.table("global_vocab").insert({
                "term":         term,
                "product_name": product_name,
                "lang":         body.lang,
                "store_type":   store_type,
                "hits":         1,
                "confidence":   confidence,
                "created_by":   vendor_id,
            }).execute()
            action = "created"

        logger.info(
            "vocab teach term=%r product=%r store=%s confidence=%d vendor=%s action=%s",
            term, product_name, store_type, confidence, vendor_id, action,
        )
        return {"ok": True, "action": action, "term": term, "product_name": product_name}

    except Exception as e:
        logger.error("vocab teach error: %s", e)
        return {"ok": False, "reason": str(e)}


@router.get("/popular")
async def popular_vocab(
    store_type: str = Query("kirana", max_length=20),
    limit:      int = Query(100, ge=1, le=500),
):
    """
    Return top vocab entries sorted by hits (for preloading into client cache).
    No auth required.
    """
    db = get_db()
    try:
        rows = (
            db.table("global_vocab")
            .select("term,product_name,lang,hits,confidence")
            .eq("store_type", store_type)
            .gte("confidence", 2)
            .order("hits", desc=True)
            .limit(limit)
            .execute()
        ).data or []
        return rows
    except Exception as e:
        logger.error("vocab popular error: %s", e)
        return []


@router.delete("/cleanup")
async def cleanup_vocab(vendor_id: str = Depends(_optional_vendor)):
    """
    Prune noisy auto-learned entries that nobody ever confirmed:
    - confidence = 1 (auto-learned only, never manually taught)
    - hits = 1     (queried only once, never repeated)
    - older than 30 days
    Safe to run any time — only removes orphaned guesses, not confirmed aliases.
    """
    db = get_db()
    try:
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        result = (
            db.table("global_vocab")
            .delete()
            .eq("confidence", 1)
            .eq("hits", 1)
            .lt("created_at", cutoff)
            .execute()
        )
        deleted = len(result.data or [])
        logger.info("vocab cleanup: deleted %d stale entries", deleted)
        return {"deleted": deleted}
    except Exception as e:
        logger.error("vocab cleanup error: %s", e)
        return {"deleted": 0, "error": str(e)}
