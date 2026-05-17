from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/wastage", tags=["wastage"])

REASONS = ["expired", "damaged", "stolen", "other"]

class WastageCreate(BaseModel):
    product_id:  str
    qty:         float
    reason:      str  # expired | damaged | stolen | other
    note:        Optional[str] = None

@router.get("/")
async def list_wastage(vendor=Depends(get_current_vendor)):
    db = get_db()
    return db.table("wastage_records")\
        .select("*, products(name, unit, cost_price)")\
        .eq("vendor_id", vendor["id"])\
        .order("created_at", desc=True)\
        .limit(100).execute().data

@router.post("/", status_code=201)
async def record_wastage(body: WastageCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    if body.reason not in REASONS:
        raise HTTPException(400, f"reason must be one of {REASONS}")
    if body.qty <= 0:
        raise HTTPException(400, "qty must be positive")

    # Get product
    prod = db.table("products").select("*")\
        .eq("id", body.product_id).eq("vendor_id", vendor["id"]).execute()
    if not prod.data:
        raise HTTPException(404, "Product not found")
    product = prod.data[0]

    # Deduct stock
    new_stock = max(0, (product["stock"] or 0) - body.qty)
    db.table("products").update({ "stock": new_stock })\
        .eq("id", body.product_id).execute()

    # Calculate loss value
    loss_value = round(body.qty * (product["cost_price"] or 0), 2)

    # Record wastage
    record = db.table("wastage_records").insert({
        "vendor_id":   vendor["id"],
        "product_id":  body.product_id,
        "product_name":product["name"],
        "qty":         body.qty,
        "unit":        product["unit"] or "piece",
        "reason":      body.reason,
        "note":        body.note,
        "loss_value":  loss_value,
        "stock_before":product["stock"] or 0,
        "stock_after": new_stock,
    }).execute().data[0]

    return record

@router.get("/summary")
async def wastage_summary(vendor=Depends(get_current_vendor)):
    db = get_db()
    records = db.table("wastage_records").select("*")\
        .eq("vendor_id", vendor["id"]).execute().data
    total_loss   = sum(r["loss_value"] or 0 for r in records)
    by_reason    = {}
    for r in records:
        by_reason[r["reason"]] = by_reason.get(r["reason"], 0) + (r["loss_value"] or 0)
    return {
        "total_loss":   round(total_loss, 2),
        "total_items":  len(records),
        "by_reason":    by_reason,
        "this_month":   round(sum(r["loss_value"] or 0 for r in records
                           if r["created_at"] and
                           datetime.fromisoformat(r["created_at"].replace("Z","+00:00")).month
                           == datetime.now(timezone.utc).month), 2)
    }
