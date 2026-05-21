import asyncio
import json
import logging
from datetime import date
from groq import AsyncGroq
import httpx

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
_GROQ_MODEL   = "llama-3.3-70b-versatile"
_GEMINI_MODEL = "gemini-1.5-flash"

LANG_NAMES = {
    "en-IN": "English", "te-IN": "Telugu",  "hi-IN": "Hindi",
    "ta-IN": "Tamil",   "kn-IN": "Kannada", "ml-IN": "Malayalam",
    "mr-IN": "Marathi", "bn-IN": "Bengali", "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
}


# ══════════════════════════════════════════════════════════════
#  TIER 1 — LOCAL INTENT CLASSIFIER
#  Handles 80% of kirana queries with zero LLM tokens
# ══════════════════════════════════════════════════════════════

# Each intent has keywords in English + Hindi + Telugu (most common kirana languages)
# Score = number of matching keywords. Score ≥ 1 → local answer, no LLM needed.
_INTENTS = [
    {
        "id": "profit",
        "keywords": [
            # English
            "profit", "earn", "earning", "income", "revenue", "margin",
            "how much made", "how much money", "what did i make",
            # Hindi
            "munafa", "kamai", "kamaai", "labh", "aaj kitna", "kitni kamai",
            "kya mila", "kitna kamaya",
            # Telugu
            "labham", "aaj enta", "rojuki enta", "ela undi",
        ],
        "tool": "get_profit_summary",
        "args": {},
    },
    {
        "id": "reorder",
        "keywords": [
            # English
            "reorder", "order list", "what to order", "what to buy", "purchase",
            "supplier", "order from", "need to order", "stock up",
            # Hindi
            "order karna", "kya mangana", "kya kharidna", "mangana hai",
            "order chahiye", "supplier se",
            # Telugu
            "order cheyyali", "em konali", "supply",
        ],
        "tool": "get_reorder_suggestions",
        "args": {},
    },
    {
        "id": "udhar",
        "keywords": [
            # English
            "udhar", "credit", "due", "owe", "debt", "outstanding",
            "who owes", "collect money", "receivable", "pending payment",
            # Hindi
            "udhaar", "baaki", "kitna baaki", "kiska baaki", "lena hai",
            # Telugu
            "adha", "ivvali", "bayatapadadam",
        ],
        "tool": "get_udhar_summary",
        "args": {},
    },
    {
        "id": "sales_today",
        "keywords": [
            # English
            "sales today", "today sales", "today revenue", "today billing",
            "how many invoices", "invoices today", "bills today",
            # Hindi
            "aaj ki bikri", "aaj kitna bika", "aaj kitni sales", "aaj ki sales",
            # Telugu
            "nenu aaj", "aaj bikri", "aaj enta ayyindi",
        ],
        "tool": "get_sales_today",
        "args": {},
    },
    {
        "id": "low_stock",
        "keywords": [
            # English
            "low stock", "out of stock", "stock alert", "running out",
            "nearly empty", "almost out", "finish",
            # Hindi
            "stock khatam", "stock kam", "khatam ho gaya", "stock low",
            "khatam hone wala",
            # Telugu
            "stock aipoyindi", "stock theesipoyindi", "stock ledu",
        ],
        "tool": "get_low_stock_items",
        "args": {},
    },
    {
        "id": "dead_stock",
        "keywords": [
            # English
            "dead stock", "unsold", "not selling", "slow moving",
            "blocked stock", "not sold", "no sales", "zero sales",
            # Hindi
            "bik nahi raha", "nahi bika", "ruka hua stock",
            # Telugu
            "ammadam ledu", "stock undipoyindi",
        ],
        "tool": "get_dead_stock",
        "args": {},
    },
    {
        "id": "best_margin",
        "keywords": [
            # English
            "best margin", "most profitable", "high margin", "top margin",
            "which product profit", "profitable items", "best profit product",
            # Hindi
            "sabse zyada profit", "sabse accha margin", "kaunsa product profit",
            # Telugu
            "ekkuva labham", "best profit",
        ],
        "tool": "get_best_margin_products",
        "args": {},
    },
    {
        "id": "leakage",
        "keywords": [
            # English
            "theft", "stolen", "leakage", "missing stock", "shrinkage",
            "pilferage", "staff stealing", "unexplained loss",
            # Hindi
            "chori", "churaya", "gum ho gaya", "missing",
            # Telugu
            "dorikithe", "poyindi", "missing stock",
        ],
        "tool": "get_leakage_alerts",
        "args": {},
    },
    {
        "id": "monthly_sales",
        "keywords": [
            # English
            "monthly sales", "this month", "month revenue", "monthly revenue",
            "month total", "how much this month",
            # Hindi
            "is mahine", "mahine ki bikri", "mahine ki kamai",
            # Telugu
            "ee nela", "nela bikri",
        ],
        "tool": "get_monthly_sales",
        "args": {},
    },
]


def _detect_intent(message: str):
    """
    Keyword scorer — returns (intent_id, tool, args, score) or None.
    Score = count of matching keywords. Any match (≥1) is enough to go local.
    """
    msg = message.lower()
    best_score  = 0
    best_intent = None

    for intent in _INTENTS:
        score = sum(1 for kw in intent["keywords"] if kw in msg)
        if score > best_score:
            best_score  = score
            best_intent = intent

    return (best_intent, best_score) if best_score >= 1 else (None, 0)


def _format_local(intent_id: str, data: dict) -> str:
    """Convert tool data to a natural, readable reply without an LLM."""

    def INR(n):
        return f"₹{int(n or 0):,}"

    if intent_id == "profit":
        t = data.get("today", {})
        m = data.get("month", {})
        lines = [
            f"💰 Today — Profit: {INR(t.get('profit', 0))} | Revenue: {INR(t.get('revenue', 0))} | Margin: {t.get('margin_pct', 0)}%",
            f"📅 This month — Profit: {INR(m.get('profit', 0))} | Revenue: {INR(m.get('revenue', 0))} | Margin: {m.get('margin_pct', 0)}%",
        ]
        return "\n".join(lines)

    if intent_id == "reorder":
        items = data.get("suggestions", [])[:10]
        if not items:
            return "✅ No reorders needed right now — all products have sufficient stock."
        lines = [
            f"• {'🔴' if i.get('urgency') == 'critical' else '🟡'} {i['name']}: "
            f"Order {i['suggested_order_qty']} {i.get('unit', '')} "
            f"({i.get('days_of_stock_left') or 'Out'} days left)"
            for i in items
        ]
        total = data.get("estimated_total_cost", 0)
        header = f"🛒 Reorder list — {data.get('count', 0)} items, est. {INR(total)}:"
        if data.get("upcoming_festivals"):
            fest  = data["upcoming_festivals"][0]
            header += f"\n⚠️ {fest['name']} in {fest['days_away']} days — quantities boosted by {int(fest['boost']*100)}%"
        return header + "\n" + "\n".join(lines)

    if intent_id == "udhar":
        total     = data.get("total_due", 0)
        customers = data.get("customers", [])[:6]
        if not customers:
            return "✅ No pending udhar — all customers are paid up!"
        lines = [f"• {c['name']}: {INR(c.get('total_due', 0))}" for c in customers]
        return (
            f"📋 Total udhar: {INR(total)} from {data.get('customer_count', 0)} customers\n"
            + "\n".join(lines)
        )

    if intent_id == "sales_today":
        by_mode = data.get("by_payment_mode", {})
        mode_str = " | ".join(f"{k}: {INR(v)}" for k, v in by_mode.items()) if by_mode else ""
        return (
            f"🧾 Today: {data.get('invoice_count', 0)} invoices, "
            f"revenue {INR(data.get('total_revenue', 0))}"
            + (f"\n{mode_str}" if mode_str else "")
        )

    if intent_id == "monthly_sales":
        return (
            f"📅 {data.get('month', 'This month')}: "
            f"{data.get('invoice_count', 0)} invoices, "
            f"revenue {INR(data.get('total_revenue', 0))}"
        )

    if intent_id == "low_stock":
        out = data.get("out_of_stock", [])
        low = data.get("low_stock", [])
        if not out and not low:
            return "✅ All products have healthy stock levels!"
        parts = []
        if out:
            parts.append(f"🔴 Out of stock ({len(out)}): " + ", ".join(p["name"] for p in out[:6]))
        if low:
            parts.append(f"🟡 Running low ({len(low)}): " + ", ".join(p["name"] for p in low[:6]))
        return "\n".join(parts)

    if intent_id == "dead_stock":
        items = data.get("items", [])[:6]
        if not items:
            return "✅ No dead stock — all products have recent sales."
        lines = [f"• {p['name']}: {p.get('stock', 0)} {p.get('unit', '')} unsold" for p in items]
        return (
            f"📦 Dead stock: {data.get('dead_stock_count', 0)} products, "
            f"{INR(data.get('total_blocked_value', 0))} blocked\n"
            + "\n".join(lines)
        )

    if intent_id == "best_margin":
        items = data.get("products", [])[:6]
        if not items:
            return "No margin data available yet."
        lines = [f"• {p['name']}: {p.get('margin_pct', 0)}% margin" for p in items]
        return "💎 Most profitable products:\n" + "\n".join(lines)

    if intent_id == "leakage":
        stolen = data.get("stolen_records", [])
        high   = data.get("high_loss_products", [])
        total  = data.get("total_potential_leakage", 0)
        if not stolen and not high:
            return "✅ No theft or abnormal loss detected in the last 30 days."
        parts = []
        if stolen:
            parts.append(f"🚨 {len(stolen)} theft record(s) — {INR(total)} potential loss")
        if high:
            parts.append("High-loss: " + ", ".join(p["product_name"] for p in high[:3]))
        return "\n".join(parts)

    return str(data)


# ══════════════════════════════════════════════════════════════
#  TIER 2 — GROQ  (existing tool-calling flow, unchanged)
# ══════════════════════════════════════════════════════════════

async def _call_groq(messages: list, vendor_id: Optional[str], use_tools: bool) -> str:
    client = AsyncGroq(api_key=settings.groq_api_key)

    if use_tools and vendor_id:
        response = await client.chat.completions.create(
            model=_GROQ_MODEL, messages=messages,
            tools=_STORE_TOOLS, tool_choice="auto", max_tokens=1024,
        )
        for _ in range(5):
            msg = response.choices[0].message
            if not msg.tool_calls:
                break
            messages.append({
                "role": "assistant", "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ],
            })
            for tc in msg.tool_calls:
                result = _run_tool(tc.function.name, json.loads(tc.function.arguments), vendor_id)
                logger.info("tool=%s vendor=%s", tc.function.name, vendor_id)
                messages.append({
                    "role": "tool", "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
            response = await client.chat.completions.create(
                model=_GROQ_MODEL, messages=messages,
                tools=_STORE_TOOLS, tool_choice="auto", max_tokens=1024,
            )
        return response.choices[0].message.content

    response = await client.chat.completions.create(
        model=_GROQ_MODEL, messages=messages, max_tokens=1024,
    )
    return response.choices[0].message.content


# ══════════════════════════════════════════════════════════════
#  TIER 3 — GEMINI FLASH  (fallback when Groq hits 429)
# ══════════════════════════════════════════════════════════════

async def _call_gemini(messages: list, system_prompt: str) -> str:
    """
    Call Gemini 1.5 Flash via REST API (no extra package — uses httpx already in requirements).
    Gemini doesn't get tool calling in fallback mode — we inject store context into the prompt.
    """
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    # Convert OpenAI message format → Gemini format
    gemini_contents = []
    for m in messages:
        if m["role"] == "system":
            continue  # system handled via system_instruction
        role = "model" if m["role"] == "assistant" else "user"
        text = m.get("content") or ""
        if text:
            gemini_contents.append({"role": role, "parts": [{"text": text}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": gemini_contents or [{"role": "user", "parts": [{"text": "Hello"}]}],
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.2},
    }

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_GEMINI_MODEL}:generateContent?key={settings.gemini_api_key}"
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


def _is_rate_limit(exc: Exception) -> bool:
    s = str(exc).lower()
    return any(k in s for k in ("rate_limit", "429", "too_many_requests", "quota", "ratelimit"))


# ══════════════════════════════════════════════════════════════
#  AUTH + TOOL EXECUTOR (unchanged from original)
# ══════════════════════════════════════════════════════════════

async def _optional_vendor(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    if not credentials:
        return None
    try:
        payload   = decode_access_token(credentials.credentials)
        vendor_id = payload.get("sub")
        if not vendor_id:
            return None
        db     = get_db()
        result = db.table("vendors").select("id,plan,is_active").eq("id", vendor_id).single().execute()
        return result.data or None
    except Exception:
        return None


class HistoryMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en-IN"
    store_context: Optional[dict] = {}
    history: Optional[list[HistoryMessage]] = []


def _run_tool(name: str, args: dict, vendor_id: str) -> dict:
    db = get_db()

    if name == "search_products":
        query   = args.get("query", "").strip()
        result  = (
            db.table("products")
            .select("name,stock,unit,mrp,cost_price,min_stock,category")
            .eq("vendor_id", vendor_id).eq("is_active", True)
            .ilike("name", f"%{query}%").limit(10).execute()
        )
        products = result.data or []
        if not products:
            return {"found": False, "message": f"No product found matching '{query}'"}
        for p in products:
            mrp  = p.get("mrp") or 0
            cost = p.get("cost_price") or 0
            p["margin_pct"]   = round((mrp - cost) / mrp * 100, 1) if mrp > 0 else 0
            p["is_low_stock"] = p.get("stock", 0) < p.get("min_stock", 10)
        return {"found": True, "products": products}

    if name == "get_low_stock_items":
        all_p = db.table("products").select("name,stock,min_stock,unit,mrp,category").eq("vendor_id", vendor_id).eq("is_active", True).execute().data or []
        out   = [p for p in all_p if (p.get("stock") or 0) <= 0]
        low   = [p for p in all_p if 0 < (p.get("stock") or 0) < p.get("min_stock", 10)]
        return {"out_of_stock": out, "low_stock": low, "out_count": len(out), "low_count": len(low)}

    if name == "get_sales_today":
        today    = date.today().isoformat()
        invoices = db.table("invoices").select("total,payment_mode,customer_name").eq("vendor_id", vendor_id).gte("created_at", f"{today}T00:00:00").execute().data or []
        total_rev = sum((inv.get("total") or 0) for inv in invoices)
        by_mode: dict = {}
        for inv in invoices:
            mode = inv.get("payment_mode", "Cash")
            by_mode[mode] = round(by_mode.get(mode, 0) + (inv.get("total") or 0), 2)
        return {"date": today, "invoice_count": len(invoices), "total_revenue": round(total_rev, 2), "by_payment_mode": by_mode}

    if name == "get_monthly_sales":
        today       = date.today()
        month_start = today.replace(day=1).isoformat()
        invoices    = db.table("invoices").select("total").eq("vendor_id", vendor_id).gte("created_at", f"{month_start}T00:00:00").execute().data or []
        total_rev   = sum((inv.get("total") or 0) for inv in invoices)
        return {"month": today.strftime("%B %Y"), "invoice_count": len(invoices), "total_revenue": round(total_rev, 2)}

    if name == "get_udhar_summary":
        customers = db.table("udhar_customers").select("name,phone,total_due,last_txn_at").eq("vendor_id", vendor_id).gt("total_due", 0).order("total_due", desc=True).limit(20).execute().data or []
        total     = sum((c.get("total_due") or 0) for c in customers)
        return {"total_due": round(total, 2), "customer_count": len(customers), "customers": customers}

    if name == "get_best_margin_products":
        products = db.table("products").select("name,mrp,cost_price,stock,unit,category").eq("vendor_id", vendor_id).eq("is_active", True).gt("mrp", 0).gt("cost_price", 0).execute().data or []
        for p in products:
            mrp  = p.get("mrp") or 0; cost = p.get("cost_price") or 0
            p["margin_pct"] = round((mrp - cost) / mrp * 100, 1) if mrp > 0 else 0
        products.sort(key=lambda x: x["margin_pct"], reverse=True)
        return {"products": products[:15]}

    if name == "get_profit_summary":
        today_str = date.today().isoformat(); month_str = date.today().replace(day=1).isoformat()
        prods     = db.table("products").select("id,cost_price").eq("vendor_id", vendor_id).execute().data or []
        cmap      = {p["id"]: float(p.get("cost_price") or 0) for p in prods}
        t_sales   = db.table("sales").select("product_id,qty,unit_price").eq("vendor_id", vendor_id).gte("sold_at", f"{today_str}T00:00:00").execute().data or []
        m_sales   = db.table("sales").select("product_id,qty,unit_price").eq("vendor_id", vendor_id).gte("sold_at", f"{month_str}T00:00:00").execute().data or []
        def _prof(sales):
            rev  = sum(float(s.get("unit_price") or 0) * float(s.get("qty") or 0) for s in sales)
            cost = sum(cmap.get(s.get("product_id", ""), 0) * float(s.get("qty") or 0) for s in sales)
            prof = round(rev - cost, 2)
            return round(rev, 2), prof, round(prof / rev * 100, 1) if rev > 0 else 0
        t_rev, t_prof, t_mar = _prof(t_sales); m_rev, m_prof, m_mar = _prof(m_sales)
        return {"today": {"revenue": t_rev, "profit": t_prof, "margin_pct": t_mar},
                "month": {"revenue": m_rev, "profit": m_prof, "margin_pct": m_mar}}

    if name == "get_dead_stock":
        from datetime import timedelta
        since    = (date.today() - timedelta(days=30)).isoformat()
        prods    = db.table("products").select("id,name,stock,unit,cost_price").eq("vendor_id", vendor_id).eq("is_active", True).gt("stock", 0).execute().data or []
        recent   = db.table("sales").select("product_id").eq("vendor_id", vendor_id).gte("sold_at", f"{since}T00:00:00").execute().data or []
        sold_ids = {s["product_id"] for s in recent}
        dead     = [p for p in prods if p["id"] not in sold_ids]
        for p in dead:
            p["blocked_value"] = round(float(p.get("stock") or 0) * float(p.get("cost_price") or 0), 2)
        dead.sort(key=lambda x: x["blocked_value"], reverse=True)
        return {"dead_stock_count": len(dead), "total_blocked_value": round(sum(p["blocked_value"] for p in dead), 2), "items": dead[:15]}

    if name == "get_reorder_suggestions":
        from datetime import timedelta
        since   = (date.today() - timedelta(days=30)).isoformat()
        sales   = db.table("sales").select("product_id,qty").eq("vendor_id", vendor_id).gte("sold_at", f"{since}T00:00:00").execute().data or []
        qty_map: dict = {}
        for s in sales:
            pid = s["product_id"]; qty_map[pid] = qty_map.get(pid, 0.0) + float(s.get("qty") or 0)
        prods = db.table("products").select("id,name,stock,unit,min_stock,cost_price").eq("vendor_id", vendor_id).eq("is_active", True).execute().data or []
        suggestions = []
        for p in prods:
            pid = p["id"]; daily = qty_map.get(pid, 0.0) / 30
            stock = float(p.get("stock") or 0); min_s = float(p.get("min_stock") or 0)
            if stock < min_s or (daily > 0 and stock / daily < 7):
                order_qty = max(0.0, round(daily * 7 - stock, 1))
                suggestions.append({"name": p["name"], "unit": p.get("unit", ""), "current_stock": stock,
                    "daily_rate": round(daily, 2), "days_left": round(stock / daily, 1) if daily > 0 else None,
                    "suggested_order_qty": order_qty,
                    "urgency": "critical" if stock <= 0 or (daily > 0 and stock / daily < 2) else "soon"})
        suggestions.sort(key=lambda x: (0 if x["urgency"] == "critical" else 1, x.get("days_left") or 9999))
        return {"suggestions": suggestions[:15], "count": len(suggestions)}

    if name == "get_leakage_alerts":
        from datetime import timedelta
        since  = (date.today() - timedelta(days=30)).isoformat()
        stolen = db.table("wastage_records").select("product_name,qty,loss_value,created_at").eq("vendor_id", vendor_id).eq("reason", "stolen").gte("created_at", f"{since}T00:00:00").order("created_at", desc=True).execute().data or []
        all_w  = db.table("wastage_records").select("product_id,product_name,qty,loss_value,reason").eq("vendor_id", vendor_id).gte("created_at", f"{since}T00:00:00").execute().data or []
        wmap: dict = {}
        for w in all_w:
            pid = w["product_id"]
            if pid not in wmap: wmap[pid] = {"name": w["product_name"], "loss": 0.0, "reasons": set()}
            wmap[pid]["loss"] += float(w.get("loss_value") or 0); wmap[pid]["reasons"].add(w.get("reason", ""))
        high = [{"product_name": v["name"], "total_loss": round(v["loss"], 2), "reasons": list(v["reasons"])} for v in wmap.values() if v["loss"] > 500]
        high.sort(key=lambda x: x["total_loss"], reverse=True)
        return {"stolen_records": stolen, "high_loss_products": high, "total_potential_leakage": round(sum(float(s.get("loss_value") or 0) for s in stolen), 2)}

    return {"error": f"Unknown tool: {name}"}


_STORE_TOOLS = [
    {"type":"function","function":{"name":"search_products","description":"Search for a product by name — returns stock, MRP, cost, margin.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}},
    {"type":"function","function":{"name":"get_low_stock_items","description":"Products out of stock or below minimum stock level.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_sales_today","description":"Today's sales: revenue, invoice count, by payment mode.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_monthly_sales","description":"This month's sales summary.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_udhar_summary","description":"Credit/udhar summary — who owes money and how much.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_best_margin_products","description":"Top products ranked by profit margin %.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_profit_summary","description":"Today's and this month's gross profit and margin.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_dead_stock","description":"Products with stock but zero sales in last 30 days.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_reorder_suggestions","description":"Smart reorder list based on 30-day sales velocity.","parameters":{"type":"object","properties":{}}}},
    {"type":"function","function":{"name":"get_leakage_alerts","description":"Theft records and high-loss products in last 30 days.","parameters":{"type":"object","properties":{}}}},
]


def _cloud_prompt(lang_name: str) -> str:
    return f"""You are DukaanAI's smart shop assistant for an Indian kirana/retail store owner.
LANGUAGE RULE: Reply ONLY in {lang_name}. Every word must be in {lang_name}.
Use the available tools to fetch LIVE store data before answering. Use ₹ for prices, bullet points for lists. Keep answers short and helpful."""


def _local_prompt(lang_name: str, ctx: dict) -> str:
    products   = ctx.get("all_products", ctx.get("products", []))
    store_sum  = ctx.get("store_summary", {})
    low_stock  = ctx.get("low_stock", [])
    out_stock  = ctx.get("out_of_stock", [])
    best_marg  = ctx.get("best_margins", [])
    udhar      = ctx.get("udhar")
    sales_an   = ctx.get("sales_analysis")
    wastage    = ctx.get("wastage_summary")

    prod_lines = "\n".join(
        f"- {p.get('name','?')} | stock:{p.get('stock',0)} {p.get('unit','')} | mrp:₹{p.get('mrp',0)} | cost:₹{p.get('cost', p.get('cost_price', 0))}"
        for p in products[:200]
    )
    udhar_sec = ""
    if udhar:
        lines = "\n".join(f"- {c.get('name','?')} owes ₹{c.get('amount_due', c.get('total_due', 0))}" for c in (udhar.get("overdue_customers") or [])[:15])
        udhar_sec = f"\nUDHAAR: Total ₹{udhar.get('total_due',0)} from {udhar.get('customer_count',0)} customers\n{lines}"

    return f"""You are DukaanAI's smart shop assistant for an Indian kirana/retail store owner.
LANGUAGE RULE: Reply ONLY in {lang_name}.
STORE: {store_sum.get('total_products', len(products))} products | Low: {store_sum.get('low_stock_count', len(low_stock))} | Revenue today: ₹{store_sum.get('today_revenue', 0)}
PRODUCTS:\n{prod_lines}
BEST MARGINS:\n{chr(10).join(f"- {p.get('name','?')}: {p.get('margin', p.get('margin_pct', 0))}%" for p in best_marg[:10])}{udhar_sec}
Use ONLY the data above. Use ₹ and bullet points. Keep it short."""


# ══════════════════════════════════════════════════════════════
#  MAIN ENDPOINT — 3-TIER CASCADE
# ══════════════════════════════════════════════════════════════

@router.post("")
async def chat(
    req: ChatRequest,
    vendor=Depends(_optional_vendor),
):
    lang_name = LANG_NAMES.get(req.language, "English")

    # ── TIER 1: Local intent classifier ──────────────────────
    if vendor:
        intent, score = _detect_intent(req.message)
        if intent:
            try:
                data  = _run_tool(intent["tool"], intent["args"], vendor["id"])
                reply = _format_local(intent["id"], data)
                logger.info("local_intent=%s score=%d vendor=%s", intent["id"], score, vendor["id"])
                return {"response": reply, "source": "local"}
            except Exception as e:
                logger.warning("Local intent failed, falling through to Groq: %s", e)

    # ── TIER 2: Groq (primary LLM) ───────────────────────────
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="AI not configured. Add GROQ_API_KEY to server environment.")

    system_prompt = _cloud_prompt(lang_name) if vendor else _local_prompt(lang_name, req.store_context or {})
    messages = [{"role": "system", "content": system_prompt}]
    for h in (req.history or []):
        role = "assistant" if h.role in ("model", "ai", "assistant") else "user"
        messages.append({"role": role, "content": h.text})
    messages.append({"role": "user", "content": req.message})

    try:
        reply = await _call_groq(messages, vendor["id"] if vendor else None, use_tools=bool(vendor))
        logger.info("groq_response vendor=%s", vendor["id"] if vendor else "anonymous")
        return {"response": reply, "source": "groq"}

    except Exception as groq_err:
        if not _is_rate_limit(groq_err):
            err = str(groq_err).lower()
            if any(k in err for k in ("api_key", "401", "403", "authentication")):
                raise HTTPException(status_code=503, detail="Invalid Groq API key.")
            if any(k in err for k in ("not found", "404", "model_not_found")):
                raise HTTPException(status_code=503, detail="Groq model unavailable.")
            raise HTTPException(status_code=500, detail=f"AI error: {type(groq_err).__name__}")

        logger.warning("Groq rate limit hit — falling back to Gemini")

    # ── TIER 3: Gemini Flash (fallback) ──────────────────────
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=429,
            detail="Too many requests — AI is busy. Please wait a moment and try again."
        )

    try:
        # For Gemini fallback: fetch store context inline so it can answer without tool calls
        if vendor:
            try:
                profit_data = _run_tool("get_profit_summary", {}, vendor["id"])
                stock_data  = _run_tool("get_low_stock_items", {}, vendor["id"])
                context_inject = (
                    f"\n\nLIVE STORE DATA:\n"
                    f"Today profit: ₹{profit_data.get('today', {}).get('profit', 0)} | "
                    f"Revenue: ₹{profit_data.get('today', {}).get('revenue', 0)}\n"
                    f"Out of stock: {', '.join(p['name'] for p in stock_data.get('out_of_stock', [])[:5]) or 'none'}\n"
                    f"Low stock: {', '.join(p['name'] for p in stock_data.get('low_stock', [])[:5]) or 'none'}"
                )
                gemini_system = _cloud_prompt(lang_name) + context_inject
            except Exception:
                gemini_system = _cloud_prompt(lang_name)
        else:
            gemini_system = _local_prompt(lang_name, req.store_context or {})

        reply = await _call_gemini(messages, gemini_system)
        logger.info("gemini_fallback vendor=%s", vendor["id"] if vendor else "anonymous")
        return {"response": reply, "source": "gemini"}

    except Exception as gemini_err:
        logger.error("Gemini fallback also failed: %s", gemini_err)
        raise HTTPException(
            status_code=503,
            detail="Both AI providers are currently busy. Please try again in a minute."
        )
