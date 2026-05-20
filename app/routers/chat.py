import asyncio
import logging
from datetime import date
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


# ── Live DB tool executor (authenticated users only) ───────────────────────────

def _run_tool(name: str, args: dict, vendor_id: str) -> dict:
    db = get_db()

    if name == "search_products":
        query = args.get("query", "").strip()
        result = (
            db.table("products")
            .select("name,stock,unit,mrp,cost_price,min_stock,category")
            .eq("vendor_id", vendor_id)
            .eq("is_active", True)
            .ilike("name", f"%{query}%")
            .limit(10)
            .execute()
        )
        products = result.data or []
        if not products:
            return {"found": False, "message": f"No product found matching '{query}'"}
        for p in products:
            mrp = p.get("mrp") or 0
            cost = p.get("cost_price") or 0
            p["margin_pct"] = round((mrp - cost) / mrp * 100, 1) if mrp > 0 else 0
            p["is_low_stock"] = p.get("stock", 0) < p.get("min_stock", 10)
        return {"found": True, "products": products}

    if name == "get_low_stock_items":
        result = (
            db.table("products")
            .select("name,stock,min_stock,unit,mrp,category")
            .eq("vendor_id", vendor_id)
            .eq("is_active", True)
            .execute()
        )
        all_p = result.data or []
        out = [p for p in all_p if (p.get("stock") or 0) <= 0]
        low = [p for p in all_p if 0 < (p.get("stock") or 0) < p.get("min_stock", 10)]
        out.sort(key=lambda x: x["name"])
        low.sort(key=lambda x: x.get("stock", 0))
        return {
            "out_of_stock": out,
            "low_stock": low,
            "out_count": len(out),
            "low_count": len(low),
        }

    if name == "get_sales_today":
        today = date.today().isoformat()
        result = (
            db.table("invoices")
            .select("total,payment_mode,customer_name")
            .eq("vendor_id", vendor_id)
            .gte("created_at", f"{today}T00:00:00")
            .execute()
        )
        invoices = result.data or []
        total_rev = sum((inv.get("total") or 0) for inv in invoices)
        by_mode: dict = {}
        for inv in invoices:
            mode = inv.get("payment_mode", "Cash")
            by_mode[mode] = round(by_mode.get(mode, 0) + (inv.get("total") or 0), 2)
        return {
            "date": today,
            "invoice_count": len(invoices),
            "total_revenue": round(total_rev, 2),
            "by_payment_mode": by_mode,
        }

    if name == "get_monthly_sales":
        today = date.today()
        month_start = today.replace(day=1).isoformat()
        result = (
            db.table("invoices")
            .select("total")
            .eq("vendor_id", vendor_id)
            .gte("created_at", f"{month_start}T00:00:00")
            .execute()
        )
        invoices = result.data or []
        total_rev = sum((inv.get("total") or 0) for inv in invoices)
        return {
            "month": today.strftime("%B %Y"),
            "invoice_count": len(invoices),
            "total_revenue": round(total_rev, 2),
        }

    if name == "get_udhar_summary":
        result = (
            db.table("udhar_customers")
            .select("name,phone,total_due,last_txn_at")
            .eq("vendor_id", vendor_id)
            .gt("total_due", 0)
            .order("total_due", desc=True)
            .limit(20)
            .execute()
        )
        customers = result.data or []
        total = sum((c.get("total_due") or 0) for c in customers)
        return {
            "total_due": round(total, 2),
            "customer_count": len(customers),
            "customers": customers,
        }

    if name == "get_best_margin_products":
        result = (
            db.table("products")
            .select("name,mrp,cost_price,stock,unit,category")
            .eq("vendor_id", vendor_id)
            .eq("is_active", True)
            .gt("mrp", 0)
            .gt("cost_price", 0)
            .execute()
        )
        products = result.data or []
        for p in products:
            mrp = p.get("mrp") or 0
            cost = p.get("cost_price") or 0
            p["margin_pct"] = round((mrp - cost) / mrp * 100, 1) if mrp > 0 else 0
        products.sort(key=lambda x: x["margin_pct"], reverse=True)
        return {"products": products[:15]}

    return {"error": f"Unknown tool: {name}"}


# ── Gemini tool schema ─────────────────────────────────────────────────────────

_STORE_TOOLS = [
    {
        "function_declarations": [
            {
                "name": "search_products",
                "description": (
                    "Search for products by name and return current stock level, MRP (selling price), "
                    "cost price, margin %, and whether it is low on stock. "
                    "Use this whenever the user asks about a specific product."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Product name or partial name, e.g. 'Amul', 'Tata Salt', 'atta'",
                        }
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "get_low_stock_items",
                "description": (
                    "Get all products that are out of stock or running low (below minimum stock level). "
                    "Use this for reorder suggestions and low-stock alerts."
                ),
                "parameters": {"type": "object", "properties": {}},
            },
            {
                "name": "get_sales_today",
                "description": (
                    "Get today's sales summary: total revenue, number of invoices, breakdown by payment mode "
                    "(Cash/UPI/Credit). Use for daily earnings questions."
                ),
                "parameters": {"type": "object", "properties": {}},
            },
            {
                "name": "get_monthly_sales",
                "description": (
                    "Get this month's sales summary: total revenue and invoice count. "
                    "Use for monthly earnings or performance questions."
                ),
                "parameters": {"type": "object", "properties": {}},
            },
            {
                "name": "get_udhar_summary",
                "description": (
                    "Get the udhar/credit summary — total amount owed by customers, "
                    "number of customers with dues, and a ranked list of who owes how much."
                ),
                "parameters": {"type": "object", "properties": {}},
            },
            {
                "name": "get_best_margin_products",
                "description": (
                    "Get the top products ranked by profit margin %. "
                    "Use when the user asks which products are most profitable or what to push more."
                ),
                "parameters": {"type": "object", "properties": {}},
            },
        ]
    }
]


# ── System prompts ─────────────────────────────────────────────────────────────

def _cloud_prompt(lang_name: str) -> str:
    return f"""You are DukaanAI's smart shop assistant for an Indian kirana/retail store owner.

LANGUAGE RULE: Reply ONLY in {lang_name}. Every word must be in {lang_name}. Never mix languages unless the language is English.

You have tools to fetch LIVE data directly from the store's database. Use the right tool whenever the user asks about:
• A specific product (stock, price, availability) → search_products
• What is low on stock or out of stock, what to reorder → get_low_stock_items
• Today's revenue, sales, invoices → get_sales_today
• This month's revenue or performance → get_monthly_sales
• Udhar, credit, who owes money → get_udhar_summary
• Most profitable products, best margins → get_best_margin_products

RESPONSE RULES:
- Always use a tool to get fresh data before answering store-related questions
- Use ₹ symbol for prices. Use bullet points (•) for lists
- Keep answers short and helpful. Use emojis where natural
- If a product is not found, say so and suggest checking the spelling"""


def _local_prompt(lang_name: str, ctx: dict) -> str:
    products       = ctx.get("all_products", ctx.get("products", []))
    store_summary  = ctx.get("store_summary", {})
    low_stock      = ctx.get("low_stock", [])
    out_of_stock   = ctx.get("out_of_stock", [])
    best_margins   = ctx.get("best_margins", [])
    sales_analysis = ctx.get("sales_analysis")
    udhar          = ctx.get("udhar")
    wastage_summary = ctx.get("wastage_summary")

    product_lines = "\n".join(
        f"- {p.get('name','?')} | stock:{p.get('stock',0)} {p.get('unit','')} "
        f"| mrp:₹{p.get('mrp',0)} | cost:₹{p.get('cost',p.get('cost_price',0))}"
        for p in products[:200]
    )
    low_names   = ", ".join(p.get("name", "?") for p in low_stock[:10]) or "None"
    out_names   = ", ".join(p.get("name", "?") for p in out_of_stock[:5]) or "None"
    margin_lines = "\n".join(
        f"- {p.get('name','?')}: {p.get('margin', p.get('margin_pct', 0))}% margin"
        for p in best_margins[:10]
    )

    udhar_section = ""
    if udhar:
        lines = "\n".join(
            f"- {c.get('name','?')} owes ₹{c.get('amount_due', c.get('total_due', 0))}"
            for c in (udhar.get("overdue_customers") or [])[:15]
        )
        udhar_section = (
            f"\nUDHAAR (CREDIT DUE):\n"
            f"Total due: ₹{udhar.get('total_due',0)} from {udhar.get('customer_count',0)} customers\n"
            f"{lines}"
        )

    sales_section = ""
    if sales_analysis:
        top = "\n".join(
            f"- {p.get('name','?')}: {p.get('units',0)} units, ₹{p.get('revenue',0)}"
            for p in (sales_analysis.get("top_by_units") or [])[:10]
        )
        sales_section = f"\nSALES ANALYSIS (last 30 days):\nTop products by units sold:\n{top}"

    wastage_section = ""
    if wastage_summary:
        wastage_section = (
            f"\nWASTAGE/LOSS:\n"
            f"Total loss: ₹{wastage_summary.get('total_loss',0)} | Items: {wastage_summary.get('total_items',0)}\n"
            f"This month: ₹{wastage_summary.get('this_month',0)}"
        )

    return f"""You are DukaanAI's smart shop assistant for an Indian kirana/retail store owner.

LANGUAGE RULE: Reply ONLY in {lang_name}. Every word must be in {lang_name}. Never mix languages unless the language is English.

STORE SUMMARY:
- Total products: {store_summary.get('total_products', len(products))}
- Low stock: {store_summary.get('low_stock_count', len(low_stock))} items ({low_names})
- Out of stock: {store_summary.get('out_of_stock_count', len(out_of_stock))} items ({out_names})
- Today's revenue: ₹{store_summary.get('today_revenue', 0)} ({store_summary.get('today_invoices', 0)} invoices)
- Monthly revenue: ₹{store_summary.get('monthly_revenue', 0)}

FULL PRODUCT LIST (name | stock | mrp | cost):
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


# ── Gemini send with auto-retry on rate-limit ─────────────────────────────────

def _is_rate_limited(exc: Exception) -> bool:
    s = str(exc).lower()
    return any(k in s for k in ("quota", "429", "resource_exhausted"))


async def _send(session, message):
    """Call session.send_message; on rate-limit wait 12 s and retry once."""
    try:
        return session.send_message(message)
    except Exception as e:
        if _is_rate_limited(e):
            logger.warning("Gemini rate limit — retrying in 12 s")
            await asyncio.sleep(12)
            return session.send_message(message)
        raise


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("")
async def chat(
    req: ChatRequest,
    vendor=Depends(_optional_vendor),
):
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI not configured. Add GEMINI_API_KEY to server environment.",
        )

    lang_name = LANG_NAMES.get(req.language, "English")

    history = [
        {
            "role": "model" if h.role in ("model", "ai", "assistant") else "user",
            "parts": [h.text],
        }
        for h in (req.history or [])
    ]

    try:
        genai.configure(api_key=settings.gemini_api_key)

        if vendor:
            # ── Authenticated: function calling against live DB ────────────
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                system_instruction=_cloud_prompt(lang_name),
                tools=_STORE_TOOLS,
            )
            session = model.start_chat(history=history)
            response = await _send(session, req.message)

            # Agentic loop — Gemini may call multiple tools
            for _ in range(5):
                fn_calls = [
                    p.function_call
                    for p in response.parts
                    if hasattr(p, "function_call") and p.function_call.name
                ]
                if not fn_calls:
                    break

                tool_parts = []
                for fc in fn_calls:
                    result = _run_tool(fc.name, dict(fc.args), vendor["id"])
                    logger.info("tool=%s vendor=%s result_keys=%s", fc.name, vendor["id"], list(result.keys()))
                    tool_parts.append(
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=fc.name,
                                response={"result": result},
                            )
                        )
                    )
                response = await _send(session, tool_parts)

            return {"response": response.text}

        else:
            # ── Local/offline: context passed from frontend ────────────────
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                system_instruction=_local_prompt(lang_name, req.store_context or {}),
            )
            session = model.start_chat(history=history)
            response = await _send(session, req.message)
            return {"response": response.text}

    except Exception as e:
        err_str = str(e).lower()
        logger.error("Gemini error [%s]: %s", type(e).__name__, e)
        if any(k in err_str for k in ("api_key", "api key", "401", "403", "unauthenticated", "permission")):
            raise HTTPException(status_code=503, detail="Invalid Gemini API key. Check GEMINI_API_KEY in Railway.")
        if any(k in err_str for k in ("quota", "429", "resource_exhausted")):
            raise HTTPException(status_code=429, detail="Too many requests — please wait 1 minute and try again.")
        if any(k in err_str for k in ("not found", "404")):
            raise HTTPException(status_code=503, detail="Gemini model not available. Contact support.")
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}")
