from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/wastage", tags=["wastage"])

REASONS = ["expired", "damaged", "stolen", "other"]


class WastageCreate(BaseModel):
    product_id: str
    qty: float
    reason: str
    note: Optional[str] = None


@router.get("/")
async def list_wastage(vendor=Depends(get_current_vendor)):
    db = get_db()
    return db.table("wastage_records").select("*").eq("vendor_id", vendor["id"]).order("created_at", desc=True).limit(100).execute().data


@router.post("/", status_code=201)
async def record_wastage(body: WastageCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    if body.reason not in REASONS:
        raise HTTPException(400, f"reason must be one of {REASONS}")
    if body.qty <= 0:
        raise HTTPException(400, "qty must be positive")
    prod = db.table("products").select("*").eq("id", body.product_id).eq("vendor_id", vendor["id"]).execute()
    if not prod.data:
        raise HTTPException(404, "Product not found")
    product = prod.data[0]
    raw_qty = float(body.qty)
    qty = int(raw_qty) if raw_qty == int(raw_qty) else raw_qty
    current_stock = float(product["stock"] or 0)
    new_stock = round(max(0, current_stock - raw_qty), 2)
    db.table("products").update({"stock": new_stock}).eq("id", body.product_id).execute()
    loss_value = round(raw_qty * float(product["cost_price"] or 0), 2)
    record = db.table("wastage_records").insert({
        "vendor_id": vendor["id"],
        "product_id": body.product_id,
        "product_name": product["name"],
        "qty": qty,
        "unit": product["unit"] or "piece",
        "reason": body.reason,
        "note": body.note,
        "loss_value": loss_value,
        "stock_before": current_stock,
        "stock_after": new_stock,
    }).execute().data[0]
    return record


@router.get("/summary")
async def wastage_summary(vendor=Depends(get_current_vendor)):
    db = get_db()
    records = db.table("wastage_records").select("*").eq("vendor_id", vendor["id"]).execute().data
    total_loss = sum(float(r["loss_value"] or 0) for r in records)
    by_reason = {}
    for r in records:
        by_reason[r["reason"]] = by_reason.get(r["reason"], 0) + float(r["loss_value"] or 0)
    this_month = sum(
        float(r["loss_value"] or 0) for r in records
        if r.get("created_at") and
        datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).month
        == datetime.now(timezone.utc).month
    )
    return {
        "total_loss": round(total_loss, 2),
        "total_items": len(records),
        "by_reason": {k: round(v, 2) for k, v in by_reason.items()},
        "this_month": round(this_month, 2),
    }