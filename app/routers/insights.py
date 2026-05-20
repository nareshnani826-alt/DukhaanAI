from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/insights", tags=["insights"])


# ── Profit ───────────────────────────────────────────────────

@router.get("/profit")
async def profit_summary(vendor=Depends(get_current_vendor)):
    """Today's and this month's estimated gross profit based on cost_price."""
    db = get_db()
    today_str       = date.today().isoformat()
    month_start_str = date.today().replace(day=1).isoformat()

    products    = db.table("products").select("id,cost_price").eq("vendor_id", vendor["id"]).execute().data or []
    cost_map    = {p["id"]: float(p.get("cost_price") or 0) for p in products}

    today_sales = (
        db.table("sales").select("product_id,qty,unit_price")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{today_str}T00:00:00")
        .execute().data or []
    )
    month_sales = (
        db.table("sales").select("product_id,qty,unit_price")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{month_start_str}T00:00:00")
        .execute().data or []
    )

    def calc(sales):
        rev  = sum(float(s.get("unit_price") or 0) * float(s.get("qty") or 0) for s in sales)
        cost = sum(cost_map.get(s.get("product_id", ""), 0) * float(s.get("qty") or 0) for s in sales)
        prof = round(rev - cost, 2)
        mar  = round(prof / rev * 100, 1) if rev > 0 else 0
        return round(rev, 2), prof, mar

    t_rev, t_prof, t_mar = calc(today_sales)
    m_rev, m_prof, m_mar = calc(month_sales)

    return {
        "today": {"revenue": t_rev, "profit": t_prof, "margin_pct": t_mar},
        "month": {"revenue": m_rev, "profit": m_prof, "margin_pct": m_mar},
    }


# ── Dead stock ───────────────────────────────────────────────

@router.get("/dead-stock")
async def dead_stock(
    days: int = Query(30, ge=7, le=90, description="Flag products unsold for this many days"),
    vendor=Depends(get_current_vendor),
):
    """Products that have stock but zero sales in the last N days."""
    db    = get_db()
    since = (date.today() - timedelta(days=days)).isoformat()

    products = (
        db.table("products").select("id,name,stock,unit,cost_price,mrp,category")
        .eq("vendor_id", vendor["id"]).eq("is_active", True).gt("stock", 0)
        .execute().data or []
    )
    recent = (
        db.table("sales").select("product_id")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{since}T00:00:00")
        .execute().data or []
    )
    sold_ids = {s["product_id"] for s in recent}

    dead = []
    for p in products:
        if p["id"] not in sold_ids:
            blocked = round(float(p.get("stock") or 0) * float(p.get("cost_price") or 0), 2)
            dead.append({**p, "blocked_value": blocked})
    dead.sort(key=lambda x: x["blocked_value"], reverse=True)

    return {
        "items":               dead,
        "count":               len(dead),
        "total_blocked_value": round(sum(d["blocked_value"] for d in dead), 2),
        "days":                days,
    }


# ── Sales velocity ───────────────────────────────────────────

@router.get("/velocity")
async def sales_velocity(vendor=Depends(get_current_vendor)):
    """Daily sales rate per product + predicted days until stockout."""
    db    = get_db()
    since = (date.today() - timedelta(days=30)).isoformat()

    sales = (
        db.table("sales").select("product_id,product_name,qty")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{since}T00:00:00")
        .execute().data or []
    )

    qty_map: dict = {}
    for s in sales:
        pid = s["product_id"]
        if pid not in qty_map:
            qty_map[pid] = {"name": s.get("product_name", ""), "qty": 0.0}
        qty_map[pid]["qty"] += float(s.get("qty") or 0)

    products  = (
        db.table("products").select("id,name,stock,unit,min_stock")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )
    stock_map = {p["id"]: p for p in products}

    result = []
    for pid, v in qty_map.items():
        p         = stock_map.get(pid, {})
        daily     = round(v["qty"] / 30, 2)
        stock     = float(p.get("stock") or 0)
        days_left = round(stock / daily, 1) if daily > 0 else None
        result.append({
            "product_id":         pid,
            "name":               p.get("name") or v["name"],
            "stock":              stock,
            "unit":               p.get("unit", ""),
            "daily_rate":         daily,
            "total_qty_30d":      round(v["qty"], 2),
            "days_until_stockout": days_left,
            "is_critical":        days_left is not None and days_left < 3,
        })

    result.sort(key=lambda x: (x["days_until_stockout"] or 9999))
    return {"items": result, "count": len(result)}


# ── Smart reorder ────────────────────────────────────────────

@router.get("/reorder")
async def reorder_suggestions(
    days_cover: int = Query(7, ge=1, le=30, description="Days of stock to ensure"),
    vendor=Depends(get_current_vendor),
):
    """Suggest order quantities so each fast-moving product covers N days of demand."""
    db    = get_db()
    since = (date.today() - timedelta(days=30)).isoformat()

    sales = (
        db.table("sales").select("product_id,qty")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{since}T00:00:00")
        .execute().data or []
    )
    qty_map: dict = {}
    for s in sales:
        pid = s["product_id"]
        qty_map[pid] = qty_map.get(pid, 0.0) + float(s.get("qty") or 0)

    products = (
        db.table("products").select("id,name,stock,unit,min_stock,mrp,cost_price")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )

    suggestions = []
    for p in products:
        pid       = p["id"]
        daily     = qty_map.get(pid, 0.0) / 30
        stock     = float(p.get("stock") or 0)
        min_stock = float(p.get("min_stock") or 0)

        needs_reorder = stock < min_stock or (daily > 0 and stock / daily < days_cover)
        if not needs_reorder:
            continue

        needed    = daily * days_cover
        order_qty = max(0.0, round(needed - stock, 1))
        days_left = round(stock / daily, 1) if daily > 0 else None
        urgency   = "critical" if (days_left is not None and days_left < 2) or stock <= 0 else "soon"

        suggestions.append({
            "name":               p["name"],
            "unit":               p.get("unit", ""),
            "current_stock":      stock,
            "daily_rate":         round(daily, 2),
            "days_of_stock_left": days_left,
            "suggested_order_qty": order_qty,
            "estimated_cost":     round(order_qty * float(p.get("cost_price") or 0), 2),
            "urgency":            urgency,
        })

    suggestions.sort(key=lambda x: (0 if x["urgency"] == "critical" else 1, x.get("days_of_stock_left") or 9999))
    return {
        "items":                suggestions,
        "count":                len(suggestions),
        "estimated_total_cost": round(sum(s["estimated_cost"] for s in suggestions), 2),
        "days_cover":           days_cover,
    }


# ── Margin alerts ────────────────────────────────────────────

@router.get("/margin-alerts")
async def margin_alerts(
    threshold: float = Query(10.0, description="Flag products below this margin %"),
    vendor=Depends(get_current_vendor),
):
    """Products whose gross margin is below the threshold."""
    db       = get_db()
    products = (
        db.table("products").select("id,name,mrp,cost_price,stock,unit,category")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .gt("mrp", 0).gt("cost_price", 0)
        .execute().data or []
    )

    alerts = []
    for p in products:
        mrp  = float(p.get("mrp") or 0)
        cost = float(p.get("cost_price") or 0)
        if mrp > 0:
            margin = round((mrp - cost) / mrp * 100, 1)
            if margin < threshold:
                alerts.append({**p, "margin_pct": margin})

    alerts.sort(key=lambda x: x["margin_pct"])
    return {"items": alerts, "count": len(alerts), "threshold": threshold}


# ── Leakage detection ────────────────────────────────────────

@router.get("/leakage")
async def leakage_detection(vendor=Depends(get_current_vendor)):
    """Surface stolen wastage records + products with high unexplained loss in last 30 days."""
    db    = get_db()
    since = (date.today() - timedelta(days=30)).isoformat()

    stolen = (
        db.table("wastage_records").select("product_name,qty,loss_value,created_at")
        .eq("vendor_id", vendor["id"]).eq("reason", "stolen")
        .gte("created_at", f"{since}T00:00:00")
        .order("created_at", desc=True)
        .execute().data or []
    )

    all_wastage = (
        db.table("wastage_records").select("product_id,product_name,qty,loss_value,reason")
        .eq("vendor_id", vendor["id"])
        .gte("created_at", f"{since}T00:00:00")
        .execute().data or []
    )

    wmap: dict = {}
    for w in all_wastage:
        pid = w["product_id"]
        if pid not in wmap:
            wmap[pid] = {"product_name": w["product_name"], "total_loss": 0.0, "reasons": set()}
        wmap[pid]["total_loss"]  += float(w.get("loss_value") or 0)
        wmap[pid]["reasons"].add(w.get("reason", ""))

    high_loss = [
        {
            "product_id":   k,
            "product_name": v["product_name"],
            "total_loss":   round(v["total_loss"], 2),
            "reasons":      list(v["reasons"]),
        }
        for k, v in wmap.items() if v["total_loss"] > 500
    ]
    high_loss.sort(key=lambda x: x["total_loss"], reverse=True)

    return {
        "stolen_records":          stolen,
        "stolen_count":            len(stolen),
        "high_loss_products":      high_loss,
        "total_potential_leakage": round(sum(float(s.get("loss_value") or 0) for s in stolen), 2),
    }


# ── Morning briefing (all-in-one) ────────────────────────────

@router.get("/briefing")
async def morning_briefing(vendor=Depends(get_current_vendor)):
    """Single endpoint that aggregates every insight signal for the daily briefing card."""
    db = get_db()

    today_str       = date.today().isoformat()
    since_30_str    = (date.today() - timedelta(days=30)).isoformat()
    month_start_str = date.today().replace(day=1).isoformat()

    # ── Fetch data ────────────────────────────────────────────
    products = (
        db.table("products").select("id,name,stock,min_stock,unit,cost_price,mrp,category")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )
    cost_map    = {p["id"]: float(p.get("cost_price") or 0) for p in products}

    today_sales = (
        db.table("sales").select("product_id,qty,unit_price")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{today_str}T00:00:00")
        .execute().data or []
    )
    recent_sales = (
        db.table("sales").select("product_id,qty")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", f"{since_30_str}T00:00:00")
        .execute().data or []
    )
    udhar_top = (
        db.table("udhar_customers").select("name,total_due")
        .eq("vendor_id", vendor["id"]).gt("total_due", 0)
        .order("total_due", desc=True).limit(5)
        .execute().data or []
    )

    # ── Stock health ──────────────────────────────────────────
    low_stock    = [p for p in products if 0 < float(p.get("stock") or 0) < float(p.get("min_stock") or 0)]
    out_of_stock = [p for p in products if float(p.get("stock") or 0) <= 0]

    # ── Dead stock ────────────────────────────────────────────
    sold_ids   = {s["product_id"] for s in recent_sales}
    dead       = [p for p in products if float(p.get("stock") or 0) > 0 and p["id"] not in sold_ids]
    dead_value = round(sum(float(p.get("stock") or 0) * float(p.get("cost_price") or 0) for p in dead), 2)

    # ── Profit today ──────────────────────────────────────────
    t_rev  = sum(float(s.get("unit_price") or 0) * float(s.get("qty") or 0) for s in today_sales)
    t_cost = sum(cost_map.get(s.get("product_id", ""), 0) * float(s.get("qty") or 0) for s in today_sales)
    today_profit = round(t_rev - t_cost, 2)
    today_margin = round(today_profit / t_rev * 100, 1) if t_rev > 0 else 0

    # ── Velocity — stockout predictions ──────────────────────
    qty_30d: dict = {}
    for s in recent_sales:
        pid = s["product_id"]
        qty_30d[pid] = qty_30d.get(pid, 0.0) + float(s.get("qty") or 0)

    predictions = []
    for p in products:
        pid   = p["id"]
        daily = qty_30d.get(pid, 0.0) / 30
        stock = float(p.get("stock") or 0)
        if daily > 0 and stock / daily < 3:
            predictions.append({
                "name":       p["name"],
                "days_left":  round(stock / daily, 1),
                "daily_rate": round(daily, 2),
                "unit":       p.get("unit", ""),
            })
    predictions.sort(key=lambda x: x["days_left"])

    # ── Margin alerts (< 10%) ─────────────────────────────────
    margin_issues = []
    for p in products:
        mrp  = float(p.get("mrp") or 0)
        cost = float(p.get("cost_price") or 0)
        if mrp > 0 and cost > 0 and (mrp - cost) / mrp < 0.10:
            margin_issues.append({
                "name":       p["name"],
                "margin_pct": round((mrp - cost) / mrp * 100, 1),
            })

    udhar_total = round(sum(float(u.get("total_due") or 0) for u in udhar_top), 2)

    return {
        "date":       today_str,
        "store_name": vendor.get("store_name", ""),
        "profit": {
            "today":         today_profit,
            "today_revenue": round(t_rev, 2),
            "margin_pct":    today_margin,
        },
        "low_stock": [
            {"name": p["name"], "stock": p["stock"], "min_stock": p["min_stock"], "unit": p.get("unit", "")}
            for p in low_stock[:5]
        ],
        "out_of_stock":         [{"name": p["name"]} for p in out_of_stock[:5]],
        "stockout_predictions": predictions[:5],
        "dead_stock": {
            "count":         len(dead),
            "blocked_value": dead_value,
            "items": [
                {"name": p["name"], "stock": p["stock"], "unit": p.get("unit", "")}
                for p in dead[:4]
            ],
        },
        "margin_alerts":  margin_issues[:5],
        "udhar": {
            "total_due":      udhar_total,
            "customer_count": len(udhar_top),
            "top": [{"name": u["name"], "amount": float(u["total_due"])} for u in udhar_top[:3]],
        },
    }
