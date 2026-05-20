import logging
import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings
from app.core.security import decode_access_token
from app.core.database import get_db

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)

async def _optional_vendor(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    """Returns vendor dict if a valid token is present, otherwise None (allows local-mode users)."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        vendor_id = payload.get("sub")
        if not vendor_id:
            return None
        db = get_db()
        result = db.table("vendors").select("id,plan,is_active").eq("id", vendor_id).single().execute()
        return result.data or None
    except Exception:
        return None

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


class HistoryMessage(BaseModel):
    role: str   # "user" or "model"
    text: str


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en-IN"
    store_context: Optional[dict] = {}
    history: Optional[list[HistoryMessage]] = []


@router.post("")
async def chat(
    req: ChatRequest,
    vendor=Depends(_optional_vendor),
):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="AI not configured. Add GEMINI_API_KEY to server environment.")

    lang_name = LANG_NAMES.get(req.language, "English")
    ctx = req.store_context or {}

    # Build compact system prompt from store context
    products        = ctx.get("all_products", ctx.get("products", []))
    store_summary   = ctx.get("store_summary", {})
    low_stock       = ctx.get("low_stock", [])
    out_of_stock    = ctx.get("out_of_stock", [])
    best_margins    = ctx.get("best_margins", [])
    sales_analysis  = ctx.get("sales_analysis")
    udhar           = ctx.get("udhar")
    wastage_summary = ctx.get("wastage_summary")

    # Product list (cap at 200 to stay within token limits)
    product_lines = "\n".join(
        f"- {p.get('name','?')} | stock:{p.get('stock',0)} {p.get('unit','')} "
        f"| mrp:₹{p.get('mrp',0)} | cost:₹{p.get('cost',p.get('cost_price',0))} "
        f"| status:{p.get('status','?')}"
        for p in products[:200]
    )

    low_names      = ", ".join(p.get("name","?") for p in low_stock[:10])  or "None"
    out_names      = ", ".join(p.get("name","?") for p in out_of_stock[:5]) or "None"
    margin_lines   = "\n".join(
        f"- {p.get('name','?')}: {p.get('margin',p.get('margin_pct',0))}% margin"
        for p in best_margins[:10]
    )

    udhar_section = ""
    if udhar:
        lines = "\n".join(
            f"- {c.get('name','?')} owes ₹{c.get('amount_due', c.get('total_due',0))}"
            for c in (udhar.get("overdue_customers") or [])[:15]
        )
        udhar_section = f"""
UDHAAR (CREDIT DUE):
Total due: ₹{udhar.get('total_due',0)} from {udhar.get('customer_count',0)} customers
{lines}"""

    sales_section = ""
    if sales_analysis:
        top = "\n".join(
            f"- {p.get('name','?')}: {p.get('units',0)} units, ₹{p.get('revenue',0)}"
            for p in (sales_analysis.get("top_by_units") or [])[:10]
        )
        sales_section = f"""
SALES ANALYSIS (last 30 days):
Top products by units sold:
{top}"""

    wastage_section = ""
    if wastage_summary:
        wastage_section = f"""
WASTAGE/LOSS:
Total loss: ₹{wastage_summary.get('total_loss',0)} | Items: {wastage_summary.get('total_items',0)}
This month: ₹{wastage_summary.get('this_month',0)}"""

    system_prompt = f"""You are DukaanAI's smart shop assistant for an Indian kirana/retail store owner.

LANGUAGE RULE: Reply ONLY in {lang_name}. Every word must be in {lang_name}. Never mix languages unless the language is English.

STORE SUMMARY:
- Total products: {store_summary.get('total_products', len(products))}
- Low stock: {store_summary.get('low_stock_count', len(low_stock))} items ({low_names})
- Out of stock: {store_summary.get('out_of_stock_count', len(out_of_stock))} items ({out_names})
- Today's revenue: ₹{store_summary.get('today_revenue',0)} ({store_summary.get('today_invoices',0)} invoices)
- Monthly revenue: ₹{store_summary.get('monthly_revenue',0)}

FULL PRODUCT LIST (name | stock | mrp | cost | status):
{product_lines}

BEST MARGIN PRODUCTS:
{margin_lines}
{udhar_section}
{sales_section}
{wastage_section}

INSTRUCTIONS:
- Use ONLY the data above to answer. Never say you don't have access to data.
- For stock/price queries: search the product list by name (partial match is fine).
- Report exact stock, MRP (selling price), cost, and margin when relevant.
- Use ₹ symbol and bullet points (•) for lists.
- Keep answers short and helpful. Use emojis where natural.
- If a product isn't found, say so and suggest similar names."""

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=system_prompt,
    )

    # Build conversation history for multi-turn support
    history = []
    for h in (req.history or []):
        role = "model" if h.role in ("model", "ai", "assistant") else "user"
        history.append({"role": role, "parts": [h.text]})

    try:
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(req.message)
        return {"response": response.text}
    except Exception as e:
        logger.error("Gemini chat error: %s", e)
        raise HTTPException(status_code=500, detail="Chat service temporarily unavailable")
