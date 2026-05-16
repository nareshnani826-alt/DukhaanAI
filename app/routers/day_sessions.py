from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, date, timedelta

from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/day-sessions", tags=["day-sessions"])


def _stock_snapshot(db, vendor_id: str) -> list:
    """Take a snapshot of all active products with current stock."""
    result = (
        db.table("products")
        .select("id,name,sku,category,unit,stock,min_stock,mrp,cost_price")
        .eq("vendor_id", vendor_id)
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    return result.data or []


def _today_sales(db, vendor_id: str) -> dict:
    """Get today's sales summary."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    sales = (
        db.table("sales")
        .select("*")
        .eq("vendor_id", vendor_id)
        .gte("sold_at", today_start)
        .execute()
    )
    data = sales.data or []
    total = sum(s["total"] for s in data)
    return {"total_sales": round(total, 2), "count": len(data), "sales": data}


def _calc_profit(snapshot_open, snapshot_close, sales_data) -> float:
    """Gross profit = revenue - cost of goods sold."""
    # Build cost map from opening snapshot
    cost_map = {p["id"]: p.get("cost_price", 0) for p in (snapshot_open or [])}
    revenue   = sales_data.get("total_sales", 0)
    # COGS = sum of (qty_sold × cost_price) per product
    cogs = sum(
        s["qty"] * cost_map.get(s["product_id"], 0)
        for s in sales_data.get("sales", [])
    )
    return round(revenue - cogs, 2)


@router.get("/today")
async def get_today_session(vendor=Depends(get_current_vendor)):
    """Get today's session — returns None if not opened yet."""
    db = get_db()
    today = date.today().isoformat()
    result = (
        db.table("day_sessions")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("date", today)
        .execute()
    )
    return result.data[0] if result.data else None


@router.post("/open")
async def open_day(vendor=Depends(get_current_vendor)):
    """Open the day — take opening stock snapshot."""
    db = get_db()
    today = date.today().isoformat()

    # Check if already opened
    existing = (
        db.table("day_sessions")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("date", today)
        .execute()
    )
    if existing.data:
        return existing.data[0]  # already open, return it

    snapshot = _stock_snapshot(db, vendor["id"])
    total_stock_value = sum(
        p["stock"] * p.get("cost_price", 0) for p in snapshot
    )

    session = db.table("day_sessions").insert({
        "vendor_id":     vendor["id"],
        "date":          today,
        "opening_stock": snapshot,
        "status":        "open",
        "notes":         f"Opened at {datetime.now(timezone.utc).strftime('%I:%M %p')} IST",
    }).execute().data[0]

    return {
        **session,
        "total_stock_value": round(total_stock_value, 2),
        "product_count":     len(snapshot),
    }


@router.post("/close")
async def close_day(vendor=Depends(get_current_vendor)):
    """Close the day — take closing snapshot, calculate profit, find low stock."""
    db = get_db()
    today = date.today().isoformat()

    # Get today's session
    existing = (
        db.table("day_sessions")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("date", today)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=400, detail="Day not opened yet. Open the day first.")

    session = existing.data[0]
    if session["status"] == "closed":
        return session  # already closed

    # Take closing snapshot
    closing_snapshot = _stock_snapshot(db, vendor["id"])
    sales_data       = _today_sales(db, vendor["id"])
    profit           = _calc_profit(session.get("opening_stock"), closing_snapshot, sales_data)

    # Find low stock items
    low_stock = [
        p for p in closing_snapshot
        if p["stock"] < p["min_stock"]
    ]

    # Update session
    updated = db.table("day_sessions").update({
        "closed_at":     datetime.now(timezone.utc).isoformat(),
        "closing_stock": closing_snapshot,
        "total_sales":   sales_data["total_sales"],
        "total_invoices":sales_data["count"],
        "gross_profit":  profit,
        "low_stock_items": low_stock,
        "status":        "closed",
    }).eq("id", session["id"]).execute().data[0]

    return {
        **updated,
        "low_stock_count": len(low_stock),
        "low_stock_items": low_stock,
    }


@router.get("/history")
async def session_history(
    limit: int = Query(30, le=90),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    result = (
        db.table("day_sessions")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("status", "closed")
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data
