from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.data.shelf_life import get_shelf_life, get_risk_level, get_shelf_life_label
from datetime import datetime, timezone

router = APIRouter(prefix="/expiry", tags=["expiry"])


def _days_since(ts: str | None) -> int:
    """Days elapsed since a Supabase ISO timestamp. Falls back to 0."""
    if not ts:
        return 0
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return max(0, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return 0


def _enrich(product: dict) -> dict:
    """Attach expiry intelligence fields to a product dict."""
    name     = product.get("name") or ""
    category = product.get("category") or ""
    days_old = _days_since(product.get("updated_at"))

    shelf_min, shelf_max = get_shelf_life(name, category)
    risk = get_risk_level(days_old, shelf_min, shelf_max)

    days_remaining = max(0, shelf_max - days_old)
    days_until_attention = max(0, int(shelf_max * 0.60) - days_old)

    return {
        **product,
        "shelf_min_days":  shelf_min,
        "shelf_max_days":  shelf_max,
        "days_in_stock":   days_old,
        "days_remaining":  days_remaining,
        "risk_level":      risk,
        "product_type":    get_shelf_life_label(name, category),
        "days_until_attention": days_until_attention,
    }


@router.get("/dashboard")
async def expiry_dashboard(vendor=Depends(get_current_vendor)):
    """
    Returns all active products enriched with expiry intelligence,
    grouped by risk level, plus summary stats.
    """
    db = get_db()
    rows = (
        db.table("products")
        .select("id,name,category,stock,unit,mrp,cost_price,updated_at,min_stock")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .gt("stock", 0)
        .order("name")
        .execute()
        .data
    )

    enriched = [_enrich(p) for p in rows]

    groups: dict[str, list] = {
        "likely_expired": [],
        "high_risk":      [],
        "attention":      [],
        "safe":           [],
    }
    for p in enriched:
        groups[p["risk_level"]].append(p)

    total_value_at_risk = sum(
        float(p.get("cost_price") or 0) * float(p.get("stock") or 0)
        for p in enriched
        if p["risk_level"] in ("likely_expired", "high_risk")
    )

    return {
        "summary": {
            "total_products":    len(enriched),
            "likely_expired":    len(groups["likely_expired"]),
            "high_risk":         len(groups["high_risk"]),
            "attention":         len(groups["attention"]),
            "safe":              len(groups["safe"]),
            "value_at_risk":     round(total_value_at_risk, 2),
        },
        "groups": groups,
    }


@router.get("/alerts")
async def expiry_alerts(vendor=Depends(get_current_vendor)):
    """
    Returns only products needing attention (high_risk + likely_expired),
    sorted by urgency (most critical first).
    """
    db = get_db()
    rows = (
        db.table("products")
        .select("id,name,category,stock,unit,mrp,cost_price,updated_at,min_stock")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .gt("stock", 0)
        .order("name")
        .execute()
        .data
    )

    alerts = [
        _enrich(p) for p in rows
        if _enrich(p)["risk_level"] in ("high_risk", "likely_expired", "attention")
    ]
    # Sort: likely_expired first, then high_risk, then attention; within each by days_remaining asc
    order = {"likely_expired": 0, "high_risk": 1, "attention": 2}
    alerts.sort(key=lambda p: (order.get(p["risk_level"], 3), p["days_remaining"]))

    return {"alerts": alerts, "count": len(alerts)}
