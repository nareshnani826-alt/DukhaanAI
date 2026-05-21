import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional

from app.core.security import decode_access_token
from app.core.database import get_db

router = APIRouter(prefix="/learning", tags=["learning"])
logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)

VALID_TYPES = {"patterns", "abbr", "rules", "corrections", "context"}


async def _require_vendor(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload   = decode_access_token(credentials.credentials)
        vendor_id = payload.get("sub")
        if not vendor_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return vendor_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


class PatternPayload(BaseModel):
    patterns:    Optional[dict] = None   # dk_pl_patterns
    abbr:        Optional[dict] = None   # dk_pl_abbr
    rules:       Optional[dict] = None   # dk_pl_rules
    corrections: Optional[dict] = None   # dk_learning_store
    context:     Optional[dict] = None   # dk_ctx_patterns


@router.get("")
async def load_patterns(vendor_id: str = Depends(_require_vendor)):
    """Load all learned pattern types for this vendor."""
    db   = get_db()
    rows = (
        db.table("vendor_learned_patterns")
        .select("pattern_type,data")
        .eq("vendor_id", vendor_id)
        .execute()
    ).data or []

    result = {row["pattern_type"]: row["data"] for row in rows}
    logger.info("load_patterns vendor=%s types=%s", vendor_id, list(result.keys()))
    return result


@router.post("")
async def save_patterns(
    body: PatternPayload,
    vendor_id: str = Depends(_require_vendor),
):
    """Upsert learned patterns for this vendor (only non-null fields are saved)."""
    db      = get_db()
    updates = {
        "patterns":    body.patterns,
        "abbr":        body.abbr,
        "rules":       body.rules,
        "corrections": body.corrections,
        "context":     body.context,
    }

    saved = []
    for ptype, data in updates.items():
        if data is None:
            continue
        db.table("vendor_learned_patterns").upsert(
            {"vendor_id": vendor_id, "pattern_type": ptype, "data": data},
            on_conflict="vendor_id,pattern_type",
        ).execute()
        saved.append(ptype)

    logger.info("save_patterns vendor=%s saved=%s", vendor_id, saved)
    return {"saved": saved}
