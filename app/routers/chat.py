import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.security import get_current_vendor

router = APIRouter(prefix="/api/chat", tags=["chat"])

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

# ── Request schema ────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en-IN"
    store_context: Optional[dict] = {}

# ── Language map ──────────────────────────────────────────────
LANG_NAMES = {
    "en-IN": "English",
    "te-IN": "Telugu",
    "hi-IN": "Hindi",
    "ta-IN": "Tamil",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "bn-IN": "Bengali",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
}

# ── Chat endpoint ─────────────────────────────────────────────
@router.post("")
async def chat(
    req: ChatRequest,
    vendor=Depends(get_current_vendor),
):
    lang_name = LANG_NAMES.get(req.language, "English")
    ctx       = req.store_context or {}

    products        = ctx.get("products", [])
    sales           = ctx.get("sales", {})
    udhar_customers = ctx.get("udhar_customers", [])
    wastage         = ctx.get("wastage", [])

    low_stock    = [p for p in products if float(p.get("stock", 0)) <= float(p.get("min_stock", 0))]
    out_of_stock = [p for p in products if float(p.get("stock", 0)) == 0]

    low_stock_names  = ", ".join([p.get("name", "?") for p in low_stock[:10]])  or "None"
    out_of_stock_names = ", ".join([p.get("name", "?") for p in out_of_stock[:5]]) or "None"
    total_udhar_due  = sum(float(c.get("total_due", 0)) for c in udhar_customers)

    # Build product list
    product_lines = "\n".join(
        [f"- {p.get('name','?')} | stock: {p.get('stock',0)} {p.get('unit','')} | price: ₹{p.get('price',0)}"
         for p in products[:150]]
    )

    # Build udhaar list
    udhar_lines = ""
    if udhar_customers:
        lines = "\n".join(
            [f"- {c.get('name','?')} owes ₹{c.get('total_due',0)}"
             for c in udhar_customers[:20]]
        )
        udhar_lines = f"UDHAAR CUSTOMERS:\n{lines}"

    # Build wastage list
    wastage_lines = ""
    if wastage:
        lines = "\n".join(
            [f"- {w.get('product_name','?')} qty: {w.get('qty',0)}"
             for w in wastage[:10]]
        )
        wastage_lines = f"RECENT WASTAGE:\n{lines}"

    system_prompt = f"""You are a helpful shop assistant for a Kirana/retail store using DukaanAI.
You MUST reply in {lang_name} language only. Keep replies short, clear and friendly.
Use ₹ symbol for prices. Use bullet points for lists.

STORE DATA:
- Total products: {len(products)}
- Low stock items ({len(low_stock)}): {low_stock_names}
- Out of stock ({len(out_of_stock)}): {out_of_stock_names}
- Today's sales: ₹{sales.get("today_total", 0)}
- Monthly sales: ₹{sales.get("month_total", 0)}
- Total udhaar due: ₹{total_udhar_due}
- Udhaar customers: {len(udhar_customers)}

FULL PRODUCT LIST (name | stock | price):
{product_lines}

{udhar_lines}

{wastage_lines}

Answer the vendor's question based on this data. Be concise and helpful."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": req.message}],
        )
        return {"response": response.content[0].text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
