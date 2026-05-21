import base64
import json
import logging
import re
from difflib import SequenceMatcher
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token

router = APIRouter(prefix="/invoice-scan", tags=["invoice-scan"])
logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)

ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/heic", "image/heif", "application/pdf",
}

EXTRACTION_PROMPT = """You are an OCR assistant for Indian kirana/wholesale store invoices.

Extract ALL line items from this invoice or bill image. Return ONLY a valid JSON array, no other text.

Format each product as:
{
  "name": "exact product name as written on invoice",
  "qty": 5,
  "unit": "kg",
  "unit_price": 45.00,
  "total": 225.00,
  "gst_percent": 5,
  "barcode": null,
  "expiry": null,
  "batch": null
}

Rules:
- qty must be a number. Convert: "half" → 0.5, "dozen" → 12, "1/2" → 0.5
- unit: use kg, g, litre, ml, pc, pack, box, dozen, carton, strip
- unit_price: price per single unit (divide total by qty if not shown)
- gst_percent: null if not visible. Common Indian GST rates: 0, 5, 12, 18, 28
- expiry: YYYY-MM format if visible, else null
- barcode: only if an actual barcode number is printed, else null
- batch: lot/batch number if visible, else null
- Return ONLY the JSON array — no markdown, no explanation, no prefix text"""


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


# ── Fuzzy matching ────────────────────────────────────────────

def _norm(s: str) -> str:
    s = s.lower().strip()
    # Normalize common weight variants: 1000g → 1kg, 500ml → 0.5l
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"(\d+)\s*gm\b", r"\1g", s)
    s = re.sub(r"(\d+)\s*gms\b", r"\1g", s)
    s = re.sub(r"(\d+)\s*ltr\b", r"\1litre", s)
    s = re.sub(r"(\d+)\s*lts\b", r"\1litre", s)
    return s


def _fuzzy_score(a: str, b: str) -> float:
    an, bn = _norm(a), _norm(b)
    base = SequenceMatcher(None, an, bn).ratio()
    # Boost if one string contains the other (handles "Surf Excel" vs "Surf Excel 1kg")
    if an in bn or bn in an:
        base = max(base, 0.78)
    return base


def _match_product(name: str, inventory: list) -> dict:
    if not inventory or not name:
        return {"type": "new", "match": None, "confidence": 0.0}

    best_score   = 0.0
    best_product = None
    for p in inventory:
        score = _fuzzy_score(name, p.get("name", ""))
        if score > best_score:
            best_score   = score
            best_product = p

    if best_score >= 0.90:
        return {"type": "exact", "match": best_product, "confidence": round(best_score, 2)}
    if best_score >= 0.62:
        return {"type": "fuzzy", "match": best_product, "confidence": round(best_score, 2)}
    return {"type": "new", "match": None, "confidence": round(best_score, 2)}


# ── Gemini Vision extraction ──────────────────────────────────

async def _gemini_extract(image_bytes: bytes, mime_type: str) -> list:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured — add GEMINI_API_KEY to Railway environment")

    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "contents": [{
            "parts": [
                {"text": EXTRACTION_PROMPT},
                {"inline_data": {"mime_type": mime_type, "data": b64}},
            ]
        }],
        "generationConfig": {"maxOutputTokens": 2048, "temperature": 0},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()

    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE).strip()
    text = re.sub(r"\s*```$",          "", text, flags=re.MULTILINE).strip()

    # Extract JSON array
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        raise ValueError(f"No JSON array in Gemini response: {text[:200]}")

    return json.loads(m.group())


# ── Routes ────────────────────────────────────────────────────

@router.post("/scan")
async def scan_invoice(
    file: UploadFile = File(...),
    vendor_id: str   = Depends(_require_vendor),
):
    """
    Upload an invoice image/PDF → Gemini Vision extracts products →
    fuzzy-match against vendor inventory → return review list.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file. Please upload JPG, PNG, WEBP, HEIC or PDF.",
        )

    MAX_BYTES = 10 * 1024 * 1024  # 10 MB
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large — max 10 MB.")

    # AI extraction
    try:
        extracted = await _gemini_extract(data, file.content_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Gemini extract failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail="Could not read invoice. Try a clearer photo with good lighting.",
        )

    if not extracted:
        raise HTTPException(status_code=422, detail="No products found in this image.")

    # Load vendor inventory for matching
    db = get_db()
    inventory = (
        db.table("products")
        .select("id,name,stock,unit,mrp,cost_price,barcode,category")
        .eq("vendor_id", vendor_id)
        .eq("is_active", True)
        .execute()
    ).data or []

    results = []
    for item in extracted:
        mi = _match_product(item.get("name", ""), inventory)
        results.append({
            "extracted_name": item.get("name", ""),
            "qty":            item.get("qty", 1),
            "unit":           item.get("unit", "pc"),
            "unit_price":     item.get("unit_price"),
            "total":          item.get("total"),
            "gst_percent":    item.get("gst_percent"),
            "barcode":        item.get("barcode"),
            "expiry":         item.get("expiry"),
            "batch":          item.get("batch"),
            "match_type":     mi["type"],      # exact | fuzzy | new
            "match_product":  mi["match"],
            "confidence":     mi["confidence"],
        })

    return {
        "items": results,
        "total": len(results),
        "exact": sum(1 for r in results if r["match_type"] == "exact"),
        "fuzzy": sum(1 for r in results if r["match_type"] == "fuzzy"),
        "new":   sum(1 for r in results if r["match_type"] == "new"),
    }


class ApplyItem(BaseModel):
    action:      str               # add_stock | create | skip
    product_id:  Optional[str]     = None
    name:        str               = ""
    qty:         float             = 0
    unit:        str               = "pc"
    unit_price:  Optional[float]   = None
    mrp:         Optional[float]   = None
    gst_percent: Optional[float]   = None
    barcode:     Optional[str]     = None
    category:    Optional[str]     = "Other"


class ApplyPayload(BaseModel):
    items: list[ApplyItem]


@router.post("/apply")
async def apply_invoice(
    body:      ApplyPayload,
    vendor_id: str = Depends(_require_vendor),
):
    """Apply the user-confirmed invoice items to inventory."""
    db      = get_db()
    added   = 0
    updated = 0
    errors  = []

    for item in body.items:
        if item.action == "skip":
            continue
        try:
            if item.action == "add_stock" and item.product_id:
                row = (
                    db.table("products")
                    .select("stock")
                    .eq("id", item.product_id)
                    .eq("vendor_id", vendor_id)
                    .single()
                    .execute()
                ).data
                current = float((row or {}).get("stock") or 0)
                patch   = {"stock": current + item.qty}
                if item.unit_price:
                    patch["cost_price"] = item.unit_price
                db.table("products").update(patch).eq("id", item.product_id).execute()
                updated += 1

            elif item.action == "create" and item.name.strip():
                db.table("products").insert({
                    "vendor_id":   vendor_id,
                    "name":        item.name.strip(),
                    "category":    item.category or "Other",
                    "unit":        item.unit or "pc",
                    "mrp":         float(item.mrp or item.unit_price or 0),
                    "cost_price":  float(item.unit_price or 0),
                    "stock":       item.qty,
                    "min_stock":   5,
                    "gst_percent": float(item.gst_percent or 0),
                    "barcode":     item.barcode,
                    "is_active":   True,
                }).execute()
                added += 1

        except Exception as e:
            logger.warning("apply item=%s err=%s", item.name, e)
            errors.append(item.name or item.product_id or "?")

    return {"added": added, "updated": updated, "errors": errors}


@router.get("/barcode/{code}")
async def lookup_barcode(
    code:      str,
    vendor_id: str = Depends(_require_vendor),
):
    """
    Look up a scanned barcode:
      1. Vendor's own inventory (by barcode field)
      2. Open Food Facts (free global product database)
    """
    db = get_db()

    # Own inventory first
    rows = (
        db.table("products")
        .select("id,name,stock,unit,mrp,cost_price,category,gst_percent,barcode")
        .eq("vendor_id", vendor_id)
        .eq("barcode", code)
        .eq("is_active", True)
        .limit(1)
        .execute()
    ).data or []

    if rows:
        return {"source": "inventory", "product": rows[0]}

    # Open Food Facts — free, no API key
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{code}.json",
                headers={"User-Agent": "DukaanAI/1.0 (+https://dukaanai.app)"},
            )
        if resp.status_code == 200:
            d = resp.json()
            if d.get("status") == 1:
                p = d["product"]
                name = (
                    p.get("product_name_en")
                    or p.get("product_name")
                    or p.get("abbreviated_product_name")
                    or ""
                ).strip()
                brands = p.get("brands", "")
                if brands and name and brands.lower() not in name.lower():
                    name = f"{brands} {name}".strip()
                cats = p.get("categories_tags") or []
                cat  = cats[0].replace("en:", "").replace("-", " ").title() if cats else "Other"
                qty_str = p.get("quantity", "")
                return {
                    "source": "openfoodfacts",
                    "product": {
                        "name":     name,
                        "category": cat,
                        "unit":     "pc",
                        "mrp":      0,
                        "barcode":  code,
                        "qty_hint": qty_str,
                    },
                }
    except Exception as e:
        logger.warning("Open Food Facts failed for %s: %s", code, e)

    return {"source": "not_found", "product": None}
