import asyncio
import json
import logging
from datetime import date
from groq import AsyncGroq

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
_MODEL  = "llama-3.3-70b-versatile"

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
            mrp  = p.get("mrp") or 0
            cost = p.get("cost_price") or 0
            p["margin_pct"]  = round((mrp - cost) / mrp * 100, 1) if mrp > 0 else 0
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
        return {"out_of_stock": out, "low_stock": low, "out_count": len(out), "low_count": len(low)}

    if name == "get_sales_today":
        today = date.today().isoformat()
        result = (
            db.table("invoices")
            .select("total,payment_mode,customer_name")
            .eq("vendor_id", vendor_id)
            .gte("created_at", f"{today}T00:00:00")
            .execute()
        )
        invoices  = result.data or []
        total_rev = sum((inv.get("total") or 0) for inv in invoices)
        by_mode: dict = {}
        for inv in invoices:
            mode = inv.get("payment_mode", "Cash")
            by_mode[mode] = round(by_mode.get(mode, 0) + (inv.get("total") or 0), 2)
        return {"date": today, "invoice_count": len(invoices), "total_revenue": round(total_rev, 2), "by_payment_mode": by_mode}

    if name == "get_monthly_sales":
        today       = date.today()
        month_start = today.replace(day=1).isoformat()
        result = (
            db.table("invoices")
            .select("total")
            .eq("vendor_id", vendor_id)
            .gte("created_at", f"{month_start}T00:00:00")
            .execute()
        )
        invoices  = result.data or []
        total_rev = sum((inv.get("total") or 0) for inv in invoices)
        return {"month": today.strftime("%B %Y"), "invoice_count": len(invoices), "total_revenue": round(total_rev, 2)}

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
        total     = sum((c.get("total_due") or 0) for c in customers)
        return {"total_due": round(total, 2), "customer_count": len(customers), "customers": customers}

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
            mrp  = p.get("mrp") or 0
            cost = p.get("cost_price") or 0
            p["margin_pct"] = round((mrp - cost) / mrp * 100, 1) if mrp > 0 else 0
        products.sort(key=lambda x: x["margin_pct"], reverse=True)
        return {"products": products[:15]}

    if name == "get_profit_summary":
        from datetime import date as _date
        today_str = _date.today().isoformat()
        month_str = _date.today().replace(day=1).isoformat()
        prods     = db.table("products").select("id,cost_price").eq("vendor_id", vendor_id).execute().data or []
        cmap      = {p["id"]: float(p.get("cost_price") or 0) for p in prods}
        t_sales   = db.table("sales").select("product_id,qty,unit_price").eq("vendor_id", vendor_id).gte("sold_at", f"{today_str}T00:00:00").execute().data or []
        m_sales   = db.table("sales").select("product_id,qty,unit_price").eq("vendor_id", vendor_id).gte("sold_at", f"{month_str}T00:00:00").execute().data or []
        def _prof(sales):
            rev  = sum(float(s.get("unit_price") or 0) * float(s.get("qty") or 0) for s in sales)
            cost = sum(cmap.get(s.get("product_id", ""), 0) * float(s.get("qty") or 0) for s in sales)
            prof = round(rev - cost, 2)
            return round(rev, 2), prof, round(prof / rev * 100, 1) if rev > 0 else 0
        t_rev, t_prof, t_mar = _prof(t_sales)
        m_rev, m_prof, m_mar = _prof(m_sales)
        return {
            "today": {"revenue": t_rev, "profit": t_prof, "margin_pct": t_mar},
            "month": {"revenue": m_rev, "profit": m_prof, "margin_pct": m_mar},
        }

    if name == "get_dead_stock":
        from datetime import date as _date, timedelta as _td
        since    = (_date.today() - _td(days=30)).isoformat()
        prods    = db.table("products").select("id,name,stock,unit,cost_price").eq("vendor_id", vendor_id).eq("is_active", True).gt("stock", 0).execute().data or []
        recent   = db.table("sales").select("product_id").eq("vendor_id", vendor_id).gte("sold_at", f"{since}T00:00:00").execute().data or []
        sold_ids = {s["product_id"] for s in recent}
        dead     = [p for p in prods if p["id"] not in sold_ids]
        for p in dead:
            p["blocked_value"] = round(float(p.get("stock") or 0) * float(p.get("cost_price") or 0), 2)
        dead.sort(key=lambda x: x["blocked_value"], reverse=True)
        return {
            "dead_stock_count":    len(dead),
            "total_blocked_value": round(sum(p["blocked_value"] for p in dead), 2),
            "items":               dead[:15],
        }

    if name == "get_reorder_suggestions":
        from datetime import date as _date, timedelta as _td
        since    = (_date.today() - _td(days=30)).isoformat()
        sales    = db.table("sales").select("product_id,qty").eq("vendor_id", vendor_id).gte("sold_at", f"{since}T00:00:00").execute().data or []
        qty_map: dict = {}
        for s in sales:
            pid = s["product_id"]; qty_map[pid] = qty_map.get(pid, 0.0) + float(s.get("qty") or 0)
        prods = db.table("products").select("id,name,stock,unit,min_stock,cost_price").eq("vendor_id", vendor_id).eq("is_active", True).execute().data or []
        suggestions = []
        for p in prods:
            pid   = p["id"]; daily = qty_map.get(pid, 0.0) / 30
            stock = float(p.get("stock") or 0); min_s = float(p.get("min_stock") or 0)
            if stock < min_s or (daily > 0 and stock / daily < 7):
                order_qty = max(0.0, round(daily * 7 - stock, 1))
                suggestions.append({
                    "name": p["name"], "unit": p.get("unit",""),
                    "current_stock": stock, "daily_rate": round(daily, 2),
                    "days_left": round(stock / daily, 1) if daily > 0 else None,
                    "suggested_order_qty": order_qty,
                    "urgency": "critical" if stock <= 0 or (daily > 0 and stock / daily < 2) else "soon",
                })
        suggestions.sort(key=lambda x: (0 if x["urgency"]=="critical" else 1, x.get("days_left") or 9999))
        return {
            "suggestions":          suggestions[:15],
            "count":                len(suggestions),
            "estimated_total_cost": round(sum(s["suggested_order_qty"] * float(next((p.get("cost_price",0) for p in prods if p["name"]==s["name"]),0)) for s in suggestions), 2),
        }

    if name == "get_leakage_alerts":
        from datetime import date as _date, timedelta as _td
        since  = (_date.today() - _td(days=30)).isoformat()
        stolen = db.table("wastage_records").select("product_name,qty,loss_value,created_at").eq("vendor_id", vendor_id).eq("reason", "stolen").gte("created_at", f"{since}T00:00:00").order("created_at", desc=True).execute().data or []
        all_w  = db.table("wastage_records").select("product_id,product_name,qty,loss_value,reason").eq("vendor_id", vendor_id).gte("created_at", f"{since}T00:00:00").execute().data or []
        wmap: dict = {}
        for w in all_w:
            pid = w["product_id"]
            if pid not in wmap: wmap[pid] = {"name": w["product_name"], "loss": 0.0, "reasons": set()}
            wmap[pid]["loss"] += float(w.get("loss_value") or 0); wmap[pid]["reasons"].add(w.get("reason",""))
        high = [{"name": v["name"], "total_loss": round(v["loss"],2), "reasons": list(v["reasons"])} for v in wmap.values() if v["loss"] > 500]
        high.sort(key=lambda x: x["total_loss"], reverse=True)
        return {
            "stolen_records":          stolen,
            "high_loss_products":      high,
            "total_potential_leakage": round(sum(float(s.get("loss_value") or 0) for s in stolen), 2),
        }

    return {"error": f"Unknown tool: {name}"}


# ── Tool schema (OpenAI / Groq format) ────────────────────────────────────────

_STORE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": (
                "Search for products by name and return current stock level, MRP (selling price), "
                "cost price, margin %, and low-stock flag. "
                "Call this whenever the user asks about a specific product."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Product name or partial name, e.g. 'Amul', 'Tata Salt', 'atta'"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_items",
            "description": "Get all products that are out of stock or running low (below minimum stock level). Use for reorder suggestions.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_today",
            "description": "Get today's sales summary: total revenue, invoice count, and breakdown by payment mode (Cash/UPI/Credit).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_monthly_sales",
            "description": "Get this month's sales summary: total revenue and invoice count.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_udhar_summary",
            "description": "Get the udhar/credit summary — who owes money, total owed, and ranked list of customers with dues.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_best_margin_products",
            "description": "Get the top products ranked by profit margin %. Use when user asks which products are most profitable.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_profit_summary",
            "description": (
                "Get today's and this month's estimated gross profit based on selling price minus cost price. "
                "Use when vendor asks about profit, earnings, how much money they made, or margin for today/this month."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dead_stock",
            "description": (
                "Find products that have stock but have NOT sold in the last 30 days. "
                "Use when vendor asks about dead stock, slow-moving items, blocked inventory, or unsold products."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_reorder_suggestions",
            "description": (
                "Get a smart reorder list — products that need to be ordered, with suggested quantities "
                "based on 30-day sales velocity to cover 7 days of demand. "
                "Use when vendor asks what to order, reorder list, purchase suggestions, or what to buy from supplier."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_leakage_alerts",
            "description": (
                "Detect potential theft or stock leakage — returns wastage records marked as 'stolen' "
                "and products with high unexplained loss in the last 30 days. "
                "Use when vendor asks about theft, leakage, missing stock, or staff issues."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


# ── System prompts ─────────────────────────────────────────────────────────────

def _cloud_prompt(lang_name: str) -> str:
    return f"""You are DukaanAI's smart shop assistant for an Indian kirana/retail store owner.

LANGUAGE RULE: Reply ONLY in {lang_name}. Every word must be in {lang_name}. Never mix languages unless the language is English.

You have tools to fetch LIVE data from this store's database. Use the right tool whenever the user asks about:
• A specific product (stock, price, availability) → search_products
• What is low on stock or out of stock, what to reorder → get_low_stock_items
• Today's revenue, sales, invoices → get_sales_today
• This month's revenue or performance → get_monthly_sales
• Udhar, credit, who owes money → get_udhar_summary
• Most profitable products, best margins → get_best_margin_products
• Today's or monthly profit, how much did I earn, gross profit → get_profit_summary
• Dead stock, slow-moving items, blocked inventory → get_dead_stock
• What to order, reorder list, purchase suggestions → get_reorder_suggestions
• Theft, leakage, missing stock, stolen items → get_leakage_alerts

RESPONSE RULES:
- Always call a tool to get fresh data before answering store-related questions
- Use ₹ symbol for prices. Use bullet points (•) for lists
- Keep answers short and helpful. Use emojis where natural
- If a product is not found, say so clearly"""


def _local_prompt(lang_name: str, ctx: dict) -> str:
    products        = ctx.get("all_products", ctx.get("products", []))
    store_summary   = ctx.get("store_summary", {})
    low_stock       = ctx.get("low_stock", [])
    out_of_stock    = ctx.get("out_of_stock", [])
    best_margins    = ctx.get("best_margins", [])
    sales_analysis  = ctx.get("sales_analysis")
    udhar           = ctx.get("udhar")
    wastage_summary = ctx.get("wastage_summary")

    product_lines = "\n".join(
        f"- {p.get('name','?')} | stock:{p.get('stock',0)} {p.get('unit','')} "
        f"| mrp:₹{p.get('mrp',0)} | cost:₹{p.get('cost', p.get('cost_price', 0))}"
        for p in products[:200]
    )
    low_names    = ", ".join(p.get("name", "?") for p in low_stock[:10])  or "None"
    out_names    = ", ".join(p.get("name", "?") for p in out_of_stock[:5]) or "None"
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
            f"\nUDHAAR (CREDIT DUE):\nTotal due: ₹{udhar.get('total_due',0)} "
            f"from {udhar.get('customer_count',0)} customers\n{lines}"
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
            f"\nWASTAGE/LOSS:\nTotal loss: ₹{wastage_summary.get('total_loss',0)} | "
            f"Items: {wastage_summary.get('total_items',0)}\n"
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
- Use ₹ symbol and bullet points (•) for lists. Keep answers short. Use emojis where natural.
- If a product isn't found, say so and suggest similar names."""


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("")
async def chat(
    req: ChatRequest,
    vendor=Depends(_optional_vendor),
):
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail="AI not configured. Add GROQ_API_KEY to server environment.",
        )

    lang_name = LANG_NAMES.get(req.language, "English")

    # Build messages list (OpenAI / Groq format)
    system_prompt = _cloud_prompt(lang_name) if vendor else _local_prompt(lang_name, req.store_context or {})
    messages = [{"role": "system", "content": system_prompt}]

    for h in (req.history or []):
        role = "assistant" if h.role in ("model", "ai", "assistant") else "user"
        messages.append({"role": role, "content": h.text})

    messages.append({"role": "user", "content": req.message})

    try:
        client = AsyncGroq(api_key=settings.groq_api_key)

        if vendor:
            # ── Authenticated: tool calling against live DB ────────────────
            response = await client.chat.completions.create(
                model=_MODEL,
                messages=messages,
                tools=_STORE_TOOLS,
                tool_choice="auto",
                max_tokens=1024,
            )

            # Agentic loop — model may call multiple tools
            for _ in range(5):
                msg = response.choices[0].message
                if not msg.tool_calls:
                    break

                # Append assistant's tool-call decision to history
                messages.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in msg.tool_calls
                    ],
                })

                # Execute each tool and add result
                for tc in msg.tool_calls:
                    fn_args = json.loads(tc.function.arguments)
                    result  = _run_tool(tc.function.name, fn_args, vendor["id"])
                    logger.info("tool=%s vendor=%s result_keys=%s", tc.function.name, vendor["id"], list(result.keys()))
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False),
                    })

                response = await client.chat.completions.create(
                   model=_MODEL,
                    messages=messages,
                    tools=_STORE_TOOLS,
                    tool_choice="auto",
                    max_tokens=1024,
                )

            return {"response": response.choices[0].message.content}

        else:
            # ── Local/offline: context from frontend, no tool calls ─────────
            response = await client.chat.completions.create(
               model=_MODEL,
                messages=messages,
                max_tokens=1024,
            )
            return {"response": response.choices[0].message.content}

    except Exception as e:
        err_str = str(e).lower()
        logger.error("Groq error [%s]: %s", type(e).__name__, e)
        if any(k in err_str for k in ("api_key", "api key", "401", "403", "authentication", "invalid_api_key", "unauthenticated")):
            raise HTTPException(status_code=503, detail="Invalid Groq API key. Check GROQ_API_KEY in Railway.")
        if any(k in err_str for k in ("rate_limit", "429", "too_many_requests", "quota")):
            raise HTTPException(status_code=429, detail="Too many requests — please wait a moment and try again.")
        if any(k in err_str for k in ("not found", "404", "model_not_found")):
            raise HTTPException(status_code=503, detail="AI model not available. Contact support.")
        raise HTTPException(status_code=500, detail=f"AI error: {type(e).__name__}")
