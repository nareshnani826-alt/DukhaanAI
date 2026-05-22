import csv
import io
import logging
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Optional

import httpx
import openpyxl
import pdfplumber
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import decode_access_token

router = APIRouter(prefix="/invoice-scan", tags=["invoice-scan"])
logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)

ALLOWED_TYPES = {
    # Images
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/heic", "image/heif",
    # PDF
    "application/pdf",
    # Excel
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",                                            # .xls
    # CSV
    "text/csv", "text/plain", "application/csv",
}

# ── Auth ──────────────────────────────────────────────────────

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


# ── Fuzzy product matching ────────────────────────────────────

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
    best_score, best_product = 0.0, None
    for p in inventory:
        score = _fuzzy_score(name, p.get("name", ""))
        if score > best_score:
            best_score, best_product = score, p
    if best_score >= 0.90:
        return {"type": "exact", "match": best_product, "confidence": round(best_score, 2)}
    if best_score >= 0.62:
        return {"type": "fuzzy", "match": best_product, "confidence": round(best_score, 2)}
    return {"type": "new", "match": None, "confidence": round(best_score, 2)}


# ── Shared helpers ────────────────────────────────────────────

_UNIT_MAP = {
    "gm": "g", "gms": "g", "gram": "g", "grams": "g",
    "ltr": "litre", "lts": "litre", "liter": "litre", "liters": "litre", "litres": "litre",
    "kgs": "kg", "kgm": "kg",
    "pcs": "pc", "piece": "pc", "pieces": "pc", "nos": "pc", "no": "pc",
    "packets": "pack", "packet": "pack", "pkt": "pack", "pkts": "pack",
    "bx": "box", "boxes": "box",
    "dz": "dozen", "doz": "dozen",
    "ctn": "carton", "ctns": "carton",
    # Indian wholesale container units → closest standard
    "bor": "pack",   # bora / sack
    "pet": "pc",     # PET bottle
    "jar": "pc",
    "tin": "pc",
    "can": "pc",
    "bag": "pack",
    "sack": "pack",
}
_UNITS = {"kg", "g", "litre", "ml", "pc", "pack", "box", "dozen", "carton", "strip"}

# Detects weight/volume embedded in a product name: "500g", "30 KG", "1 LTR"
_EMBEDDED_WEIGHT_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|kg|kgs|kgm|ml|litre|liter|ltr|lts)\b", re.I
)
_RICE_RE = re.compile(r"\brice\b", re.I)


def _classify_weight(name: str) -> tuple[Optional[str], Optional[float]]:
    """
    Decide inventory unit and bulk conversion factor from the weight in a product name.

    Returns (unit, bulk_kg):
      • weight > 5 KG, not rice → ('kg', <weight_kg>)  — loose product sold by kg
      • weight ≤ 5 KG           → ('pack', None)        — consumer-packed good
      • rice bag (any weight)   → ('pack', None)        — sold as whole bags
      • no embedded weight      → (None, None)          — no change
    """
    m = _EMBEDDED_WEIGHT_RE.search(name)
    if not m:
        return None, None

    val      = float(m.group(1))
    raw_unit = m.group(2).lower()

    if raw_unit in ("g", "gm", "gms", "gram", "grams"):
        val_kg = val / 1000
    elif raw_unit in ("ml",):
        val_kg = val / 1000
    elif raw_unit in ("litre", "liter", "ltr", "lts"):
        val_kg = val              # 1 litre ≈ 1 kg for liquids
    else:                         # kg / kgs / kgm
        val_kg = val

    if _RICE_RE.search(name):     # rice bags always sold whole
        return "pack", None

    if val_kg > 5:
        return "kg", val_kg       # loose: dal, flour, sabudana bags > 5 kg
    return "pack", None           # consumer pack: 500 g besan, 1 kg oil, etc.

_SKIP_WORDS = re.compile(
    r"^(sr|s\.no|sno|sl\.?no|item|product|description|particulars|qty|quantity|"
    r"unit|rate|price|amount|total|grand|sub.?total|invoice|bill|date|gst|sgst|"
    r"cgst|igst|mrp|discount|tax|hsn|value|nos|narration|particular|bal|balance|"
    r"net|gross|vat|cess|freight|charges|other|misc|round|rounding|received|"
    r"authoris|signature|thank|page|www)$",
    re.I,
)

_NUM_RE  = re.compile(r"[\d,]+(?:\.\d+)?")

# Recognises qty+unit combos like "1.0 BOR", "10.0 PCS", "25.0 KGS"
# Placed before standard units so BOR/PET/KGS are caught
_QTY_UNIT_RE = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*"
    r"(BOR|PET|JAR|TIN|CAN|BAG|SACK|"           # wholesale containers
    r"KGS?|GMS?|LTR|LTS|MLS?|"                  # metric (upper)
    r"PCS?|NOS?|"                                # pieces
    r"kg|g|gm|gms?|gram|litre|liter|ltr|ml|"    # metric (lower)
    r"pc|pcs|piece|pack|pkt|box|dozen|doz|carton|ctn|strip)"
    r"\b", re.I
)


def _parse_num(s) -> Optional[float]:
    """Convert '1,234.50' or '1234' or 1234 → float."""
    if s is None:
        return None
    try:
        return float(str(s).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _norm_unit(raw: str) -> str:
    u = raw.lower().strip()
    return _UNIT_MAP.get(u, u if u in _UNITS else "pc")


def _make_item(name, qty, unit, unit_price, total, gst=None):
    return {
        "name":        str(name).strip()[:60],
        "qty":         qty or 1,
        "unit":        _norm_unit(str(unit)) if unit else "pc",
        "unit_price":  round(float(unit_price), 2) if unit_price else None,
        "total":       round(float(total), 2)      if total      else None,
        "gst_percent": gst,
        "barcode":     None,
        "expiry":      None,
        "batch":       None,
    }


# ── Parser 1: Structured table rows (PDF tables / Excel / CSV) ─

# Keywords that identify each column type
_COL_NAME   = re.compile(r"name|item|product|description|particular|goods|narration", re.I)
_COL_QTY    = re.compile(r"^(qty|quantity|nos?|pcs?|units?)$", re.I)
_COL_UNIT   = re.compile(r"^(unit|uom|measure)$", re.I)
_COL_UPRICE = re.compile(r"rate|price|unit.?price|mrp|cost|per.?unit|basic", re.I)
_COL_TOTAL  = re.compile(r"amount|total|value|net|gross", re.I)
_COL_GST    = re.compile(r"gst|tax|vat|cess", re.I)


def _detect_header(rows: list[list]) -> Optional[tuple[int, dict]]:
    """Find the header row and return (row_index, col_map)."""
    for i, row in enumerate(rows[:12]):          # header must be in first 12 rows
        cells = [str(c or "").strip() for c in row]
        hits  = sum(
            1 for c in cells
            if _COL_NAME.search(c) or _COL_QTY.search(c) or _COL_UPRICE.search(c) or _COL_TOTAL.search(c)
        )
        if hits >= 2:
            col = {}
            for j, c in enumerate(cells):
                if _COL_NAME.search(c)   and "name"    not in col: col["name"]       = j
                if _COL_QTY.search(c)    and "qty"     not in col: col["qty"]        = j
                if _COL_UNIT.search(c)   and "unit"    not in col: col["unit"]       = j
                if _COL_UPRICE.search(c) and "uprice"  not in col: col["unit_price"] = j
                if _COL_TOTAL.search(c)  and "total"   not in col: col["total"]      = j
                if _COL_GST.search(c)    and "gst"     not in col: col["gst"]        = j
            if "name" in col:
                return (i, col)
    return None


def _parse_table_rows(rows: list[list]) -> list:
    """Parse a list-of-lists table into invoice items."""
    result = _detect_header(rows)
    if result is None:
        return []

    header_idx, col = result
    items = []
    for row in rows[header_idx + 1:]:
        if not any(row):
            continue
        cells = [str(c or "").strip() for c in row]

        name = cells[col["name"]] if col.get("name") is not None and col["name"] < len(cells) else ""
        name = name.strip()
        if not name or len(name) < 2:
            continue
        if _SKIP_WORDS.match(name):
            continue
        # Skip if name looks like a number (total rows, etc.)
        if re.fullmatch(r"[\d,.\s₹Rs/-]+", name):
            continue

        def _get(key):
            idx = col.get(key)
            return cells[idx] if idx is not None and idx < len(cells) else None

        qty        = _parse_num(_get("qty"))
        unit       = _get("unit") or "pc"
        unit_price = _parse_num(_get("unit_price"))
        total      = _parse_num(_get("total"))
        gst        = _parse_num(_get("gst"))

        # Derive missing values
        if qty and total and not unit_price:
            unit_price = round(total / qty, 2)
        if qty and unit_price and not total:
            total = round(qty * unit_price, 2)
        if not qty:
            qty = 1

        if not unit_price and not total:
            continue  # no pricing info, skip

        inv_unit, bulk_kg = _classify_weight(name)
        if inv_unit is not None:
            if bulk_kg is not None:          # loose bulk product (>5 KG in name)
                new_qty = (qty or 1) * bulk_kg
                if total:
                    unit_price = round(total / new_qty, 2)
                elif unit_price:
                    unit_price = round(unit_price / bulk_kg, 2)
                qty = new_qty
            unit = inv_unit

        items.append(_make_item(name, qty, unit, unit_price, total, gst))

    return items


# ── Parser 2: Free-form text (image OCR / PDF fallback) ──────

_PRICE_NUM = re.compile(r"\d[\d,]*(?:\.\d{1,2})?")
_PCT_RE    = re.compile(r"\(\s*\d+(?:\.\d+)?\s*%\s*\)")   # (0.0%) patterns
_ROW_SKIP  = re.compile(
    r"(invoice\s*no|bill\s*to|ship\s*to|gstin|pan\s*:|cin\s*:|grand\s*total|"
    r"sub.?total|sgst|cgst|igst|discount|round|freight|thank|rupees|"
    r"amount\s*in\s*words|authoris|signature|page\s*\d|www\.|\.com|\.in|"
    r"received\s*amount|total\s*amount)", re.I
)


def _parse_ocr_text(text: str) -> list:
    """
    Table-aware line parser for OCR text from invoice images.

    Indian invoice table format:
      [S.No.]  PRODUCT NAME [WEIGHT]  -  QTY UNIT  RATE  [DISC]  [TAX]  AMOUNT

    Strategy:
    1. Split at the HSN separator " - " first → name LEFT, qty+prices RIGHT.
       This prevents matching weights inside product names (e.g. "50 KG" in
       "CHANA 50 KG") as the QTY column.
    2. If no separator, fall back to unit-scan then word-boundary heuristic.
    """
    items = []
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    for raw_line in lines:
        line = _PCT_RE.sub("", raw_line).strip()
        if len(line) < 4:
            continue
        if _ROW_SKIP.search(line):
            continue

        # Strip leading row number "1 ", "2. ", "10 "
        working = re.sub(r"^\d{1,3}\.?\s+", "", line).strip()
        if not working or not working[0].isalpha():
            continue

        first_word = working.split()[0]
        if _SKIP_WORDS.match(first_word) and len(working.split()) <= 2:
            continue

        name = ""
        qty  = 1
        unit = "pc"
        nums: list[float] = []

        # ── Strategy 1: split at HSN separator " - " ─────────────
        # Most Indian wholesale invoices use a bare "-" as the HSN placeholder.
        # Splitting here isolates the product name from the qty/price section.
        sep_m = re.search(r"\s+-\s+", working)
        if sep_m:
            name      = working[:sep_m.start()].strip()
            after_sep = working[sep_m.end():].strip()

            # Qty+unit must be at the START of the after-separator section
            qty_m = _QTY_UNIT_RE.match(after_sep)
            if not qty_m:
                # Sometimes a small gap exists; search within first 20 chars
                qty_m = _QTY_UNIT_RE.search(after_sep[:30])

            if qty_m:
                qty  = _parse_num(qty_m.group(1)) or 1
                unit = _norm_unit(qty_m.group(2))
                tail = after_sep[qty_m.end():].strip()
            else:
                qty  = 1
                unit = "pc"
                tail = after_sep

            nums = [v for s in _PRICE_NUM.findall(tail)
                    if (v := _parse_num(s)) is not None and v > 0]

        # ── Strategy 2: no separator — find ALL qty+unit matches ──
        else:
            all_matches = list(_QTY_UNIT_RE.finditer(working))

            if len(all_matches) >= 2:
                # Multiple matches: first is embedded in the product name
                # (e.g. "50 KG" in "CHANA 50 KG"), last is the actual QTY column
                # (e.g. "1.0 BOR").  Always use the LAST match as QTY.
                last_m = all_matches[-1]
                name   = working[:last_m.start()].strip().rstrip(" -–—")
                qty    = _parse_num(last_m.group(1)) or 1
                unit   = _norm_unit(last_m.group(2))
                tail   = working[last_m.end():].strip()
                nums   = [v for s in _PRICE_NUM.findall(tail)
                          if (v := _parse_num(s)) is not None and v > 0]

            elif len(all_matches) == 1:
                only_m     = all_matches[0]
                after_nums = [v for s in _PRICE_NUM.findall(working[only_m.end():])
                              if (v := _parse_num(s)) is not None and v > 0]
                if len(after_nums) >= 2:
                    # Prices follow the unit → this is the QTY column
                    name = working[:only_m.start()].strip().rstrip(" -–—")
                    qty  = _parse_num(only_m.group(1)) or 1
                    unit = _norm_unit(only_m.group(2))
                    tail = working[only_m.end():].strip()
                    nums = after_nums
                else:
                    # Unit is embedded in name, QTY column not recognised → qty=1
                    name = working[:only_m.end()].strip()
                    qty  = 1
                    unit = "pc"
                    nums = [v for s in _PRICE_NUM.findall(working)
                            if (v := _parse_num(s)) is not None and v > 0]

            else:
                # No unit at all — take leading words as name, rest as numbers
                words = working.split()
                name_words: list[str] = []
                for w in words:
                    if re.fullmatch(r"[\d,.\-₹Rs/]+", w) and name_words:
                        break
                    name_words.append(w)
                name = " ".join(name_words).strip().rstrip(" -–—")
                nums = [v for s in _PRICE_NUM.findall(working)
                        if (v := _parse_num(s)) is not None and v > 0]

        # ── Validate name ─────────────────────────────────────────
        if not name or len(name) < 3:
            continue
        if _SKIP_WORDS.match(name.split()[0]) and len(name.split()) <= 2:
            continue
        if re.fullmatch(r"[\d,.\s₹Rs/\-]+", name):
            continue
        if not nums:
            continue

        # ── Pick RATE (first) and AMOUNT (last) ───────────────────
        # Column order after qty+unit: RATE  [DISC_AMT]  [TAX_AMT]  AMOUNT
        total      = nums[-1]
        unit_price = nums[0] if len(nums) >= 2 else None

        if unit_price and qty > 1:
            if abs(unit_price * qty - total) / (total + 0.01) > 0.25:
                unit_price = round(total / qty, 2)
        elif not unit_price:
            unit_price = round(total / qty, 2) if qty > 1 else total

        if not unit_price and not total:
            continue

        inv_unit, bulk_kg = _classify_weight(name)
        if inv_unit is not None:
            if bulk_kg is not None:          # loose bulk product (>5 KG in name)
                new_qty = (qty or 1) * bulk_kg
                if total:
                    unit_price = round(total / new_qty, 2)
                elif unit_price:
                    unit_price = round(unit_price / bulk_kg, 2)
                qty = new_qty
            unit = inv_unit

        items.append(_make_item(name, qty, unit, unit_price, total))

    return items


# ── EasyOCR (server-side, local, no API) ─────────────────────
# Singleton — model loads once (~600 MB download on first use, then cached)
_ocr_reader = None


def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        try:
            import easyocr
            logger.info("Loading EasyOCR model (first use — may take a minute)…")
            _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            logger.info("EasyOCR ready")
        except ImportError:
            logger.warning("easyocr not installed — falling back to Tesseract text")
    return _ocr_reader


def _easyocr_rows_to_text(results: list) -> str:
    """
    Convert EasyOCR bounding-box results into line-ordered plain text.
    Items on the same horizontal band (within 15 px Y) are joined left→right
    so that table columns stay in the correct reading order.
    """
    if not results:
        return ""

    # Each result: (bbox, text, confidence)
    # bbox: [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
    entries = []
    for bbox, text, conf in results:
        if conf < 0.25 or not text.strip():
            continue
        ys = [p[1] for p in bbox]
        xs = [p[0] for p in bbox]
        cy = (min(ys) + max(ys)) / 2
        cx = (min(xs) + max(xs)) / 2
        entries.append((cy, cx, text.strip()))

    if not entries:
        return ""

    entries.sort(key=lambda e: e[0])          # sort top→bottom

    # Group into rows: items within 18 px vertically = same row
    rows: list[list] = [[entries[0]]]
    for entry in entries[1:]:
        if abs(entry[0] - rows[-1][-1][0]) <= 18:
            rows[-1].append(entry)
        else:
            rows.append([entry])

    lines = []
    for row in rows:
        row.sort(key=lambda e: e[1])          # sort left→right within each row
        lines.append(" ".join(e[2] for e in row))

    return "\n".join(lines)


def _extract_image(raw: bytes, mime: str) -> list:
    """Server-side OCR using EasyOCR (local, no external API)."""
    from PIL import Image
    import numpy as np

    try:
        # Convert to RGB numpy array (EasyOCR expects this)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img_array = np.array(img)
    except Exception as e:
        logger.error("Image open failed: %s", e)
        return []

    reader = _get_ocr_reader()
    if reader is None:
        return []

    try:
        results = reader.readtext(
            img_array,
            detail=1,
            paragraph=False,   # individual text blocks — better for tables
        )
        text = _easyocr_rows_to_text(results)
        logger.info("invoice_scan easyocr chars=%d", len(text))
        if not text.strip():
            return []
        return _parse_ocr_text(text)
    except Exception as e:
        logger.error("EasyOCR failed: %s", e)
        return []


# ── File-type extractors ──────────────────────────────────────

def _extract_pdf(raw: bytes) -> list:
    """pdfplumber: try table extraction first, fall back to plain text."""
    items = []
    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            # ── Pass 1: table extraction (works on most digital invoices) ──
            all_rows: list[list] = []
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    all_rows.extend(table)

            if all_rows:
                items = _parse_table_rows(all_rows)
                if items:
                    logger.info("invoice_scan pdf table items=%d", len(items))
                    return items

            # ── Pass 2: plain text fallback ───────────────────────────────
            full_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
            if full_text.strip():
                items = _parse_ocr_text(full_text)
                logger.info("invoice_scan pdf text items=%d", len(items))
    except Exception as e:
        logger.error("PDF extract failed: %s", e)

    return items


def _extract_excel(raw: bytes) -> list:
    """openpyxl: read all sheets and parse the first sheet with invoice data."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True)
        for sheet in wb.worksheets:
            rows = [
                [cell.value for cell in row]
                for row in sheet.iter_rows()
            ]
            # Drop completely empty rows
            rows = [r for r in rows if any(c is not None and str(c).strip() for c in r)]
            if not rows:
                continue
            items = _parse_table_rows(rows)
            if items:
                logger.info("invoice_scan excel sheet=%s items=%d", sheet.title, len(items))
                return items
    except Exception as e:
        logger.error("Excel extract failed: %s", e)
    return []


def _extract_csv(raw: bytes) -> list:
    """csv.reader: parse delimiter-separated invoice."""
    try:
        text = raw.decode("utf-8-sig", errors="replace")  # handles BOM
        sample = text[:4096]
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        reader  = csv.reader(io.StringIO(text), dialect)
        rows    = [row for row in reader if any(c.strip() for c in row)]
        items   = _parse_table_rows(rows)
        if items:
            logger.info("invoice_scan csv items=%d", len(items))
            return items
        # Fallback: treat as plain text if no table structure found
        return _parse_ocr_text(text)
    except Exception as e:
        logger.error("CSV extract failed: %s", e)
    return []


# ── Result builder ────────────────────────────────────────────

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
    tesseract_text: str        = Form(""),   # kept for API compatibility, no longer used
    confidence:     float      = Form(0.0),
    vendor_id:      str        = Depends(_require_vendor),
):
    """
    Local multi-format invoice parser — no external AI, no rate limits:
      • Image  → EasyOCR (server-side deep-learning OCR, local)
      • PDF    → pdfplumber table extraction → text fallback
      • Excel  → openpyxl row extraction
      • CSV    → csv.reader table extraction
    """
    mime = (file.content_type or "").lower().split(";")[0].strip()

    # Accept CSV even when browser sends as text/plain
    filename = (file.filename or "").lower()
    if filename.endswith(".csv"):
        mime = "text/csv"

    if mime not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file. Upload JPG, PNG, WEBP, HEIC, PDF, Excel (.xlsx/.xls) or CSV.",
        )

    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large — max 10 MB.")

    extracted: Optional[list] = None
    tier_used: str            = "local"

    # ── Images: EasyOCR (server-side, local deep-learning OCR) ──
    if mime.startswith("image/"):
        import asyncio
        extracted = await asyncio.get_event_loop().run_in_executor(
            None, _extract_image, raw, mime
        )
        tier_used = "image"
        logger.info("invoice_scan image easyocr items=%d", len(extracted or []))
        if not extracted:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not read invoice items from this image. "
                    "Try a flat, well-lit photo without shadows, or upload as PDF/Excel for best results."
                ),
            )

    # ── PDF ───────────────────────────────────────────────────
    elif mime == "application/pdf":
        extracted = _extract_pdf(raw)
        tier_used = "pdf"
        if not extracted:
            raise HTTPException(
                status_code=422,
                detail="Could not extract items from this PDF. Make sure it is a digital (not scanned) PDF, or export the invoice as Excel/CSV.",
            )

    # ── Excel ─────────────────────────────────────────────────
    elif mime in {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    } or filename.endswith((".xlsx", ".xls")):
        extracted = _extract_excel(raw)
        tier_used = "excel"
        if not extracted:
            raise HTTPException(
                status_code=422,
                detail="Could not find invoice items in this Excel file. Make sure it has column headers like Item, Qty, Rate/Price.",
            )

    # ── CSV ───────────────────────────────────────────────────
    elif mime in {"text/csv", "text/plain", "application/csv"} or filename.endswith(".csv"):
        extracted = _extract_csv(raw)
        tier_used = "csv"
        if not extracted:
            raise HTTPException(
                status_code=422,
                detail="Could not find invoice items in this CSV. Make sure it has headers like Item/Product, Qty, Rate/Price.",
            )

    else:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    if not extracted:
        raise HTTPException(
            status_code=422,
            detail="Could not extract any items. Try a clearer file or use Excel/CSV format.",
        )

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
                    .select("stock,unit")
                    .eq("id", item.product_id)
                    .eq("vendor_id", vendor_id)
                    .single()
                    .execute()
                ).data
                current     = int((row or {}).get("stock") or 0)
                stored_unit = (row or {}).get("unit") or "pc"
                incoming    = round(float(item.qty))
                # Unit changed (e.g. pc→kg): set stock to invoice qty, don't add to wrong old count
                if item.unit and item.unit != stored_unit:
                    new_stock = incoming
                else:
                    new_stock = current + incoming
                patch = {"stock": new_stock}
                if item.unit_price:
                    patch["cost_price"] = item.unit_price
                if item.unit:
                    patch["unit"] = item.unit
                patch["updated_at"] = datetime.now(timezone.utc).isoformat()
                db.table("products").update(patch).eq("id", item.product_id).execute()
                updated += 1

            elif item.action == "create" and item.name.strip():
                row = {
                    "vendor_id":   vendor_id,
                    "name":        item.name.strip(),
                    "category":    item.category or "Other",
                    "unit":        item.unit or "pc",
                    "mrp":         float(item.mrp or item.unit_price or 0),
                    "cost_price":  float(item.unit_price or 0),
                    "stock":       round(float(item.qty)),
                    "min_stock":   5,
                    "gst_percent": int(float(item.gst_percent or 0)),
                    "is_active":   True,
                }
                if item.barcode:
                    row["barcode"] = item.barcode
                db.table("products").insert(row).execute()
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
    db   = get_db()
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
