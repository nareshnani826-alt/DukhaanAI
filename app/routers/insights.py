from datetime import date, timedelta, datetime, timezone
from collections import defaultdict
import statistics
from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/insights", tags=["insights"])


# ══════════════════════════════════════════════════════════════
#  ML UTILITY FUNCTIONS
# ══════════════════════════════════════════════════════════════

# Indian festival dates with demand boost (0.0–1.0)
# Updated annually; lunar dates are approximate for the calendar year
_FESTIVALS = [
    {"name": "Makar Sankranti", "date": date(2026, 1, 14), "boost": 0.60},
    {"name": "Republic Day",    "date": date(2026, 1, 26), "boost": 0.20},
    {"name": "Holi",            "date": date(2026, 3,  2), "boost": 0.70},
    {"name": "Ugadi/Baisakhi",  "date": date(2026, 3, 30), "boost": 0.50},
    {"name": "Eid ul-Fitr",     "date": date(2026, 3, 20), "boost": 0.80},
    {"name": "Eid ul-Adha",     "date": date(2026, 5, 27), "boost": 0.60},
    {"name": "Independence Day","date": date(2026, 8, 15), "boost": 0.25},
    {"name": "Raksha Bandhan",  "date": date(2026, 8, 22), "boost": 0.60},
    {"name": "Janmashtami",     "date": date(2026, 8, 24), "boost": 0.70},
    {"name": "Ganesh Chaturthi","date": date(2026, 9, 11), "boost": 0.80},
    {"name": "Navratri",        "date": date(2026, 10, 1), "boost": 0.70},
    {"name": "Dussehra",        "date": date(2026, 10,21), "boost": 0.40},
    {"name": "Diwali",          "date": date(2026, 10,29), "boost": 1.00},
    {"name": "Christmas",       "date": date(2026, 12,25), "boost": 0.40},
]


def get_upcoming_festivals(days_ahead: int = 14):
    """Return (max_boost, list_of_upcoming) for festivals within days_ahead."""
    today     = date.today()
    max_boost = 0.0
    upcoming  = []
    for f in _FESTIVALS:
        diff = (f["date"] - today).days
        if 0 <= diff <= days_ahead:
            max_boost = max(max_boost, f["boost"])
            upcoming.append({"name": f["name"], "days_away": diff, "boost": f["boost"]})
    return max_boost, upcoming


def build_daily_map(sales: list, today: date, lookback_days: int = 90) -> dict:
    """
    Build {product_id: {date_str: qty}} from raw sales rows.
    Filters to lookback_days.
    """
    cutoff = today - timedelta(days=lookback_days)
    result: dict = {}
    for s in sales:
        pid     = s["product_id"]
        day_str = (s.get("sold_at") or "")[:10]
        if not day_str:
            continue
        try:
            d = date.fromisoformat(day_str)
        except ValueError:
            continue
        if d < cutoff:
            continue
        if pid not in result:
            result[pid] = defaultdict(float)
        result[pid][day_str] += float(s.get("qty") or 0)
    return result


def ewma_daily_rate(day_map: dict, today: date, window: int = 30) -> float:
    """
    Exponentially Weighted Moving Average over last `window` days.
    Recent days carry more weight: today=3.0, last 7d=2.5, 7-14d=1.5, older=1.0
    This replaces the naive total/30 average and responds faster to demand changes.
    """
    total_weighted = 0.0
    total_weight   = 0.0
    for i in range(window):
        d   = today - timedelta(days=i)
        qty = day_map.get(d.isoformat(), 0.0)
        w   = 3.0 if i == 0 else 2.5 if i < 7 else 1.5 if i < 14 else 1.0
        total_weighted += qty * w
        total_weight   += w
    return total_weighted / total_weight if total_weight > 0 else 0.0


def day_of_week_multiplier(day_map: dict, today: date, lookback: int = 90) -> float:
    """
    Compare today's day-of-week average vs. overall daily average.
    Returns a multiplier (e.g., 1.4 means today's weekday sells 40% more than average).
    """
    dow_buckets: dict = defaultdict(list)
    for i in range(lookback):
        d   = today - timedelta(days=i)
        qty = day_map.get(d.isoformat(), 0.0)
        dow_buckets[d.weekday()].append(qty)

    today_dow = today.weekday()
    today_avg = (statistics.mean(dow_buckets[today_dow])
                 if dow_buckets[today_dow] else 0.0)
    all_vals  = [q for qs in dow_buckets.values() for q in qs]
    overall   = statistics.mean(all_vals) if all_vals else 0.0

    return round(today_avg / overall, 2) if overall > 0 else 1.0


# ══════════════════════════════════════════════════════════════
#  EXISTING ENDPOINTS (improved)
# ══════════════════════════════════════════════════════════════

@router.get("/profit")
async def profit_summary(vendor=Depends(get_current_vendor)):
    """Today's and this month's gross profit based on cost_price."""
    db = get_db()
    today_str       = date.today().isoformat()
    month_start_str = date.today().replace(day=1).isoformat()

    products    = db.table("products").select("id,cost_price").eq("vendor_id", vendor["id"]).execute().data or []
    cost_map    = {p["id"]: float(p.get("cost_price") or 0) for p in products}

    today_sales = (
        db.table("sales").select("product_id,qty,unit_price")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{today_str}T00:00:00")
        .execute().data or []
    )
    month_sales = (
        db.table("sales").select("product_id,qty,unit_price")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{month_start_str}T00:00:00")
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


@router.get("/dead-stock")
async def dead_stock(
    days: int = Query(30, ge=7, le=90),
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
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{since}T00:00:00")
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


@router.get("/velocity")
async def sales_velocity(vendor=Depends(get_current_vendor)):
    """
    Daily sales rate per product + predicted days until stockout.
    Uses EWMA (recent days weighted higher) + day-of-week multiplier.
    """
    db    = get_db()
    today = date.today()
    since = (today - timedelta(days=90)).isoformat()

    sales = (
        db.table("sales").select("product_id,product_name,qty,sold_at")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{since}T00:00:00")
        .execute().data or []
    )

    daily_maps = build_daily_map(sales, today, lookback_days=90)
    name_map   = {s["product_id"]: s.get("product_name", "") for s in sales}

    products  = (
        db.table("products").select("id,name,stock,unit,min_stock")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )
    stock_map = {p["id"]: p for p in products}

    result = []
    for pid, day_map in daily_maps.items():
        p           = stock_map.get(pid, {})
        ewma        = ewma_daily_rate(day_map, today)
        dow_mult    = day_of_week_multiplier(day_map, today)
        today_rate  = round(ewma * dow_mult, 2)
        stock       = float(p.get("stock") or 0)
        days_left   = round(stock / ewma, 1) if ewma > 0 else None
        total_30d   = sum(v for k, v in day_map.items()
                          if (today - date.fromisoformat(k)).days <= 30)

        result.append({
            "product_id":          pid,
            "name":                p.get("name") or name_map.get(pid, ""),
            "stock":               stock,
            "unit":                p.get("unit", ""),
            "daily_rate":          round(ewma, 2),
            "daily_rate_today":    today_rate,
            "dow_multiplier":      dow_mult,
            "total_qty_30d":       round(total_30d, 2),
            "days_until_stockout": days_left,
            "is_critical":         days_left is not None and days_left < 3,
        })

    result.sort(key=lambda x: (x["days_until_stockout"] or 9999))
    return {"items": result, "count": len(result)}


@router.get("/reorder")
async def reorder_suggestions(
    days_cover: int = Query(7, ge=1, le=30),
    vendor=Depends(get_current_vendor),
):
    """
    Suggest order quantities for N-day coverage.
    Uses EWMA velocity + festival demand boost when a festival is within 14 days.
    """
    db    = get_db()
    today = date.today()
    since = (today - timedelta(days=90)).isoformat()

    sales = (
        db.table("sales").select("product_id,qty,sold_at")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{since}T00:00:00")
        .execute().data or []
    )

    daily_maps = build_daily_map(sales, today, lookback_days=90)

    products = (
        db.table("products").select("id,name,stock,unit,min_stock,mrp,cost_price")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )

    festival_boost, upcoming_festivals = get_upcoming_festivals(days_ahead=14)
    boost_multiplier = 1.0 + festival_boost  # 1.0 = normal, 2.0 = Diwali

    suggestions = []
    for p in products:
        pid       = p["id"]
        day_map   = daily_maps.get(pid, {})
        ewma      = ewma_daily_rate(day_map, today) if day_map else 0.0
        stock     = float(p.get("stock") or 0)
        min_stock = float(p.get("min_stock") or 0)

        needs_reorder = stock < min_stock or (ewma > 0 and stock / ewma < days_cover)
        if not needs_reorder:
            continue

        needed    = ewma * boost_multiplier * days_cover
        order_qty = max(0.0, round(needed - stock, 1))
        days_left = round(stock / ewma, 1) if ewma > 0 else None
        urgency   = "critical" if (days_left is not None and days_left < 2) or stock <= 0 else "soon"

        suggestions.append({
            "name":                   p["name"],
            "unit":                   p.get("unit", ""),
            "current_stock":          stock,
            "daily_rate":             round(ewma, 2),
            "days_of_stock_left":     days_left,
            "suggested_order_qty":    order_qty,
            "estimated_cost":         round(order_qty * float(p.get("cost_price") or 0), 2),
            "urgency":                urgency,
            "festival_boost_applied": festival_boost > 0,
        })

    suggestions.sort(key=lambda x: (0 if x["urgency"] == "critical" else 1,
                                    x.get("days_of_stock_left") or 9999))
    return {
        "items":                suggestions,
        "count":                len(suggestions),
        "estimated_total_cost": round(sum(s["estimated_cost"] for s in suggestions), 2),
        "days_cover":           days_cover,
        "festival_boost":       festival_boost,
        "upcoming_festivals":   upcoming_festivals,
    }


@router.get("/margin-alerts")
async def margin_alerts(
    threshold: float = Query(10.0),
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


@router.get("/leakage")
async def leakage_detection(vendor=Depends(get_current_vendor)):
    """Stolen wastage records + products with high unexplained loss in last 30 days."""
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
        .eq("vendor_id", vendor["id"]).gte("created_at", f"{since}T00:00:00")
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
        {"product_id": k, "product_name": v["product_name"],
         "total_loss": round(v["total_loss"], 2), "reasons": list(v["reasons"])}
        for k, v in wmap.items() if v["total_loss"] > 500
    ]
    high_loss.sort(key=lambda x: x["total_loss"], reverse=True)

    return {
        "stolen_records":          stolen,
        "stolen_count":            len(stolen),
        "high_loss_products":      high_loss,
        "total_potential_leakage": round(sum(float(s.get("loss_value") or 0) for s in stolen), 2),
    }


# ══════════════════════════════════════════════════════════════
#  NEW ML ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/churn")
async def customer_churn(vendor=Depends(get_current_vendor)):
    """
    Customers who are overdue for a visit based on their historical visit frequency.
    Uses average inter-visit gap to flag at-risk regulars.
    """
    db = get_db()

    customers = (
        db.table("customers")
        .select("id,name,phone,visit_count,last_visited,total_spent,created_at")
        .eq("vendor_id", vendor["id"])
        .gt("visit_count", 2)
        .execute().data or []
    )

    alerts = []
    now_utc = datetime.now(timezone.utc)

    for c in customers:
        last_visited = c.get("last_visited")
        visit_count  = int(c.get("visit_count") or 0)
        if not last_visited or visit_count < 3:
            continue

        try:
            last_dt    = datetime.fromisoformat(last_visited.replace("Z", "+00:00"))
            created_dt = datetime.fromisoformat((c.get("created_at") or last_visited).replace("Z", "+00:00"))
        except ValueError:
            continue

        days_since   = (now_utc - last_dt).days
        account_days = max(1, (now_utc - created_dt).days)
        avg_gap      = max(1, account_days // visit_count)

        # Alert if overdue by more than 1.5× their usual gap
        if days_since > avg_gap * 1.5:
            risk = "high" if days_since > avg_gap * 3 else "medium"
            alerts.append({
                "name":                    c["name"],
                "phone":                   c.get("phone"),
                "total_spent":             round(float(c.get("total_spent") or 0), 2),
                "visit_count":             visit_count,
                "days_since_last_visit":   days_since,
                "avg_days_between_visits": avg_gap,
                "overdue_by_days":         days_since - avg_gap,
                "risk":                    risk,
            })

    alerts.sort(key=lambda x: x["days_since_last_visit"], reverse=True)
    return {
        "items":            alerts,
        "count":            len(alerts),
        "high_risk_count":  sum(1 for a in alerts if a["risk"] == "high"),
    }


@router.get("/wastage-anomaly")
async def wastage_anomaly(vendor=Depends(get_current_vendor)):
    """
    Detect products with abnormally high wastage this week using z-score.
    z > 2.0 = warning, z > 3.0 = critical (statistically unusual loss).
    """
    db    = get_db()
    today = date.today()
    since = (today - timedelta(weeks=12)).isoformat()

    wastage = (
        db.table("wastage_records")
        .select("product_id,product_name,loss_value,reason,created_at")
        .eq("vendor_id", vendor["id"])
        .gte("created_at", f"{since}T00:00:00")
        .execute().data or []
    )

    # Group loss by product and by week (0 = current week)
    product_weekly: dict = defaultdict(lambda: defaultdict(float))
    product_names:  dict = {}

    for w in wastage:
        pid = w["product_id"]
        product_names[pid] = w.get("product_name", "")
        try:
            d  = date.fromisoformat((w.get("created_at") or "")[:10])
            wk = (today - d).days // 7
        except ValueError:
            continue
        product_weekly[pid][wk] += float(w.get("loss_value") or 0)

    anomalies = []
    for pid, weekly in product_weekly.items():
        this_week = weekly.get(0, 0.0)
        historical = [v for wk, v in weekly.items() if wk > 0]

        if len(historical) < 3 or this_week == 0:
            continue

        mean = statistics.mean(historical)
        std  = statistics.stdev(historical) if len(historical) > 1 else 0.0
        if std == 0:
            continue

        z = (this_week - mean) / std
        if z > 2.0:
            anomalies.append({
                "product_id":      pid,
                "product_name":    product_names[pid],
                "this_week_loss":  round(this_week, 2),
                "avg_weekly_loss": round(mean, 2),
                "z_score":         round(z, 2),
                "severity":        "critical" if z > 3.0 else "warning",
                "message": (
                    f"₹{round(this_week)} this week vs ₹{round(mean)} average — "
                    f"{'possible theft or bad batch' if z > 3.0 else 'above normal loss'}"
                ),
            })

    anomalies.sort(key=lambda x: x["z_score"], reverse=True)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.get("/min-stock-suggestions")
async def min_stock_suggestions(vendor=Depends(get_current_vendor)):
    """
    Suggest better min_stock thresholds based on 90-day peak demand.
    Uses 75th-percentile weekly demand so the buffer covers busy weeks, not just average.
    """
    db    = get_db()
    today = date.today()
    since = (today - timedelta(days=90)).isoformat()

    sales = (
        db.table("sales").select("product_id,qty,sold_at")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{since}T00:00:00")
        .execute().data or []
    )

    daily_maps = build_daily_map(sales, today, lookback_days=90)

    products = (
        db.table("products").select("id,name,stock,unit,min_stock")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )

    suggestions = []
    for p in products:
        pid     = p["id"]
        day_map = daily_maps.get(pid, {})
        if not day_map:
            continue

        # Aggregate into weekly totals
        weekly: dict = defaultdict(float)
        for day_str, qty in day_map.items():
            try:
                wk = (today - date.fromisoformat(day_str)).days // 7
            except ValueError:
                continue
            if wk < 13:
                weekly[wk] += qty

        if len(weekly) < 4:
            continue

        # 75th-percentile weekly demand (peak, not average)
        values    = sorted(weekly.values(), reverse=True)
        p75_index = max(0, len(values) // 4)
        peak_week = values[p75_index]
        suggested = round(peak_week / 7 * 7, 1)  # 7-day buffer at peak rate

        current = float(p.get("min_stock") or 0)
        if suggested <= 0:
            continue

        change_pct = round((suggested - current) / max(current, 0.1) * 100)
        if abs(change_pct) < 20:  # skip if change is trivial
            continue

        suggestions.append({
            "product_id":          pid,
            "name":                p["name"],
            "unit":                p.get("unit", ""),
            "current_min_stock":   current,
            "suggested_min_stock": suggested,
            "change_pct":          change_pct,
            "direction":           "increase" if suggested > current else "decrease",
            "reason": (
                f"Peak weekly demand is {round(peak_week, 1)} {p.get('unit', '')}. "
                f"7-day buffer at peak = {suggested} {p.get('unit', '')}."
            ),
        })

    suggestions.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    return {"suggestions": suggestions, "count": len(suggestions)}


# ══════════════════════════════════════════════════════════════
#  MORNING BRIEFING (updated to include new signals)
# ══════════════════════════════════════════════════════════════

@router.get("/briefing")
async def morning_briefing(vendor=Depends(get_current_vendor)):
    """All-in-one morning intelligence card — now includes festival boost + churn signals."""
    db    = get_db()
    today = date.today()

    today_str       = today.isoformat()
    since_30_str    = (today - timedelta(days=30)).isoformat()
    since_90_str    = (today - timedelta(days=90)).isoformat()
    month_start_str = today.replace(day=1).isoformat()

    products = (
        db.table("products").select("id,name,stock,min_stock,unit,cost_price,mrp,category")
        .eq("vendor_id", vendor["id"]).eq("is_active", True)
        .execute().data or []
    )
    cost_map = {p["id"]: float(p.get("cost_price") or 0) for p in products}

    today_sales = (
        db.table("sales").select("product_id,qty,unit_price")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{today_str}T00:00:00")
        .execute().data or []
    )
    sales_90d = (
        db.table("sales").select("product_id,qty,sold_at")
        .eq("vendor_id", vendor["id"]).gte("sold_at", f"{since_90_str}T00:00:00")
        .execute().data or []
    )
    udhar_top = (
        db.table("udhar_customers").select("name,total_due")
        .eq("vendor_id", vendor["id"]).gt("total_due", 0)
        .order("total_due", desc=True).limit(5)
        .execute().data or []
    )
    udhar_collected_today = (
        db.table("udhar_transactions").select("amount")
        .eq("vendor_id", vendor["id"]).eq("type", "payment")
        .gte("created_at", f"{today_str}T00:00:00")
        .execute().data or []
    )

    # Stock health
    low_stock    = [p for p in products if 0 < float(p.get("stock") or 0) < float(p.get("min_stock") or 0)]
    out_of_stock = [p for p in products if float(p.get("stock") or 0) <= 0]

    # Dead stock (no sales in 30 days)
    sold_30d_ids = {s["product_id"] for s in sales_90d
                    if (today - date.fromisoformat((s.get("sold_at") or "")[:10] or today_str)).days <= 30}
    dead       = [p for p in products if float(p.get("stock") or 0) > 0 and p["id"] not in sold_30d_ids]
    dead_value = round(sum(float(p.get("stock") or 0) * float(p.get("cost_price") or 0) for p in dead), 2)

    # Today's profit
    t_rev  = sum(float(s.get("unit_price") or 0) * float(s.get("qty") or 0) for s in today_sales)
    t_cost = sum(cost_map.get(s.get("product_id", ""), 0) * float(s.get("qty") or 0) for s in today_sales)
    today_profit = round(t_rev - t_cost, 2)
    today_margin = round(today_profit / t_rev * 100, 1) if t_rev > 0 else 0

    # EWMA velocity — stockout predictions
    daily_maps  = build_daily_map(sales_90d, today, lookback_days=90)
    predictions = []
    for p in products:
        pid    = p["id"]
        day_map = daily_maps.get(pid, {})
        ewma   = ewma_daily_rate(day_map, today) if day_map else 0.0
        stock  = float(p.get("stock") or 0)
        if ewma > 0 and stock / ewma < 3:
            predictions.append({
                "name":       p["name"],
                "days_left":  round(stock / ewma, 1),
                "daily_rate": round(ewma, 2),
                "unit":       p.get("unit", ""),
            })
    predictions.sort(key=lambda x: x["days_left"])

    # Margin alerts
    margin_issues = []
    for p in products:
        mrp  = float(p.get("mrp") or 0)
        cost = float(p.get("cost_price") or 0)
        if mrp > 0 and cost > 0 and (mrp - cost) / mrp < 0.10:
            margin_issues.append({"name": p["name"], "margin_pct": round((mrp - cost) / mrp * 100, 1)})

    # Festival signals
    festival_boost, upcoming_festivals = get_upcoming_festivals(days_ahead=14)

    udhar_total = round(sum(float(u.get("total_due") or 0) for u in udhar_top), 2)
    udhar_kaata = round(sum(float(t.get("amount") or 0) for t in udhar_collected_today), 2)

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
            "items":         [{"name": p["name"], "stock": p["stock"], "unit": p.get("unit", "")} for p in dead[:4]],
        },
        "margin_alerts":    margin_issues[:5],
        "festival_signals": {"boost": festival_boost, "upcoming": upcoming_festivals},
        "udhar": {
            "total_due":       udhar_total,
            "customer_count":  len(udhar_top),
            "top":             [{"name": u["name"], "amount": float(u["total_due"])} for u in udhar_top[:3]],
            "collected_today": udhar_kaata,
        },
    }
