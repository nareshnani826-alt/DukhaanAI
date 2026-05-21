import base64
import json
import logging
import re
from difflib import SequenceMatcher
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from groq import AsyncGroq
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

# ── Prompts ───────────────────────────────────────────────────

_VISION_PROMPT = """You are an OCR assistant for Indian kirana/wholesale store invoices.

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

_TEXT_PROMPT_TPL = """You are parsing OCR text from an Indian kirana/wholesale invoice.
Extract all product line items from this text. Return ONLY a valid JSON array, no other text.

OCR text:
{text}

Format each product as:
{{"name": "product name", "qty": 5, "unit": "kg", "unit_price": 45.00, "total": 225.00, "gst_percent": null, "barcode": null, "expiry": null, "batch": null}}

Rules:
- unit: use kg, g, litre, ml, pc, pack, box, dozen, carton, strip
- gst_percent: common Indian rates: 0, 5, 12, 18, 28, or null
- Skip header rows (Sr, Item, Description, Qty, Rate, Amount, Total, Sub-total, Grand total)
- Return ONLY the JSON array — no markdown, no explanation"""


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
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"(\d+)\s*gm\b",  r"\1g",     s)
    s = re.sub(r"(\d+)\s*gms\b", r"\1g",     s)
    s = re.sub(r"(\d+)\s*ltr\b", r"\1litre", s)
    s = re.sub(r"(\d+)\s*lts\b", r"\1litre", s)
    return s


def _fuzzy_score(a: str, b: str) -> float:
    an, bn = _norm(a), _norm(b)
    base = SequenceMatcher(None, an, bn).ratio()
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


# ── Tier 1: Regex parser on Tesseract text ────────────────────

_UNIT_RE   = re.compile(r"\b(kg|g|gm|gms|litre|ltr|lts|ml|pc|pcs|pack|box|dozen|carton|strip|nos?)\b", re.I)
_PRICE_RE  = re.compile(r"(\d+(?:\.\d{1,2})?)")
_SKIP_RE   = re.compile(r"^(sr|s\.no|sno|item|product|description|particulars|qty|quantity|unit|rate|amount|total|grand|sub.?total|invoice|bill|date|gst|sgst|cgst|igst|mrp|discount|tax|hsn)", re.I)

_UNIT_MAP  = {"gm": "g", "gms": "g", "ltr": "litre", "lts": "litre", "pcs": "pc", "nos": "pc", "no": "pc"}


def _regex_parse(text: str) -> list:
    """Best-effort line-by-line regex parse of OCR invoice text."""
    items = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line or len(line) < 6:
            continue
        if _SKIP_RE.match(line):
            continue

        numbers = _PRICE_RE.findall(line)
        if len(numbers) < 2:
            continue

        # Name = text before first digit run
        name_m = re.match(r"^([A-Za-z][A-Za-z0-9 \-\./&'\"()%+]{2,}?)(?=\s*\d)", line)
        if not name_m:
            continue
        name = name_m.group(1).strip()
        if len(name) < 3:
            continue

        unit_m = _UNIT_RE.search(line)
        raw_u  = unit_m.group(1).lower() if unit_m else "pc"
        unit   = _UNIT_MAP.get(raw_u, raw_u)

        floats    = [float(n) for n in numbers]
        qty       = floats[0] if floats[0] < 1000 else 1
        total     = floats[-1] if len(floats) >= 2 else 0.0
        unit_price = floats[-2] if len(floats) >= 3 else (round(total / qty, 2) if qty else total)

        items.append({
            "name":        name[:60],
            "qty":         qty,
            "unit":        unit,
            "unit_price":  round(unit_price, 2),
            "total":       round(total, 2),
            "gst_percent": None,
            "barcode":     None,
            "expiry":      None,
            "batch":       None,
        })

    return items


# ── Tier 2: Gemini Vision ─────────────────────────────────────

async def _gemini_extract(image_bytes: bytes, mime_type: str) -> list:
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "contents": [{
            "parts": [
                {"text": _VISION_PROMPT},
                {"inline_data": {"mime_type": mime_type, "data": b64}},
            ]
        }],
        "generationConfig": {"maxOutputTokens": 2048, "temperature": 0},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={settings.gemini_api_key}"
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()  # raises httpx.HTTPStatusError on 4xx/5xx

    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE).strip()
    text = re.sub(r"\s*```$",          "", text, flags=re.MULTILINE).strip()

    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        raise ValueError(f"No JSON array in Gemini response: {text[:200]}")

    return json.loads(m.group())


# ── Tier 3: Groq text parsing ─────────────────────────────────

async def _groq_extract(ocr_text: str) -> list:
    client   = AsyncGroq(api_key=settings.groq_api_key, timeout=30.0)
    prompt   = _TEXT_PROMPT_TPL.format(text=ocr_text[:3000])
    response = await client.chat.completions.create(
        model    = "llama-3.3-70b-versatile",
        messages = [{"role": "user", "content": prompt}],
        max_tokens  = 2048,
        temperature = 0,
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE).strip()
    raw = re.sub(r"\s*```$",          "", raw, flags=re.MULTILINE).strip()

    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if not m:
        raise ValueError(f"No JSON array from Groq: {raw[:200]}")

    return json.loads(m.group())


# ── Shared: build result list ─────────────────────────────────

def _build_results(extracted: list, inventory: list) -> list:
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
            "match_type":     mi["type"],
            "match_product":  mi["match"],
            "confidence":     mi["confidence"],
        })
    return results


# ── Routes ────────────────────────────────────────────────────

@router.post("/scan")
async def scan_invoice(
    file:           UploadFile = File(...),
    tesseract_text: str        = Form(""),
    confidence:     float      = Form(0.0),
    vendor_id:      str        = Depends(_require_vendor),
):
    """
    4-tier OCR cascade:
      Tier 1 — Tesseract (browser OCR, ≥75% confidence) → regex parse  [free, zero latency]
      Tier 2 — Gemini Vision (1,500 req/day free)                        [best accuracy]
      Tier 3 — Groq Llama (on Gemini 429) + Tesseract text              [fallback LLM]
      Tier 4 — Regex on Tesseract text (last resort)                     [always available]
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file. Please upload JPG, PNG, WEBP, HEIC or PDF.",
        )

    MAX_BYTES = 10 * 1024 * 1024
    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large — max 10 MB.")

    extracted: Optional[list] = None
    tier_used: Optional[str]  = None

    # ── Tier 1: Tesseract text + regex (free, instant) ────────
    has_text = bool(tesseract_text.strip())
    if has_text and confidence >= 75.0:
        try:
            parsed = _regex_parse(tesseract_text)
            if parsed:
                extracted = parsed
                tier_used = "tesseract"
                logger.info("invoice_scan tier=1 tesseract conf=%.0f items=%d", confidence, len(parsed))
        except Exception as e:
            logger.warning("Regex parse failed: %s", e)

    # ── Tier 2: Gemini Vision (free 1500/day) ─────────────────
    if extracted is None and settings.gemini_api_key:
        try:
            extracted = await _gemini_extract(raw, file.content_type)
            tier_used = "gemini"
            logger.info("invoice_scan tier=2 gemini items=%d", len(extracted))
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Gemini 429 — falling back to Groq")
            else:
                logger.error("Gemini HTTP %d: %s", e.response.status_code, e.response.text[:200])
        except Exception as e:
            logger.error("Gemini extract failed: %s", e)

    # ── Tier 3: Groq + Tesseract text (on Gemini 429) ─────────
    if extracted is None and settings.groq_api_key and has_text:
        try:
            extracted = await _groq_extract(tesseract_text)
            tier_used = "groq"
            logger.info("invoice_scan tier=3 groq items=%d", len(extracted))
        except Exception as e:
            logger.warning("Groq extract failed: %s", e)

    # ── Tier 4: Regex fallback (even low-confidence text) ─────
    if extracted is None and has_text:
        try:
            extracted = _regex_parse(tesseract_text)
            tier_used = "regex"
            logger.info("invoice_scan tier=4 regex fallback items=%d", len(extracted or []))
        except Exception as e:
            logger.error("Regex fallback failed: %s", e)

    if not extracted:
        raise HTTPException(
            status_code=422,
            detail="Could not read invoice. Try a clearer photo with good lighting.",
        )

    # Load vendor inventory for matching
    db        = get_db()
    inventory = (
        db.table("products")
        .select("id,name,stock,unit,mrp,cost_price,category")
        .eq("vendor_id", vendor_id)
        .eq("is_active", True)
        .execute()
    ).data or []

    results = _build_results(extracted, inventory)

    return {
        "items": results,
        "total": len(results),
        "exact": sum(1 for r in results if r["match_type"] == "exact"),
        "fuzzy": sum(1 for r in results if r["match_type"] == "fuzzy"),
        "new":   sum(1 for r in results if r["match_type"] == "new"),
        "tier":  tier_used,
    }


class ApplyItem(BaseModel):
    action:      str
    product_id:  Optional[str]   = None
    name:        str             = ""
    qty:         float           = 0
    unit:        str             = "pc"
    unit_price:  Optional[float] = None
    mrp:         Optional[float] = None
    gst_percent: Optional[float] = None
    barcode:     Optional[str]   = None
    category:    Optional[str]   = "Other"


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

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://world.openfoodfacts.org/api/v2/product/{code}.json",
                headers={"User-Agent": "DukaanAI/1.0 (+https://dukaanai.app)"},
            )
        if resp.status_code == 200:
            d = resp.json()
            if d.get("status") == 1:
                p      = d["product"]
                name   = (
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
                return {
                    "source": "openfoodfacts",
                    "product": {
                        "name":     name,
                        "category": cat,
                        "unit":     "pc",
                        "mrp":      0,
                        "barcode":  code,
                        "qty_hint": p.get("quantity", ""),
                    },
                }
    except Exception as e:
        logger.warning("Open Food Facts failed for %s: %s", code, e)

    return {"source": "not_found", "product": None}
