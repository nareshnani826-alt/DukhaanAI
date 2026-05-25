from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/customers", tags=["customers"])


class CustomerUpsert(BaseModel):
    name: str
    phone: Optional[str] = None
    gstin: Optional[str] = None
    amount: float = 0


@router.get("")
async def list_customers(
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    q = (
        db.table("customers")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .order("total_spent", desc=True)
        .limit(limit)
    )
    if search:
        # Supabase: filter by name or phone using or_
        q = q.or_(f"name.ilike.%{search}%,phone.ilike.%{search}%")

    return q.execute().data


@router.post("/upsert")
async def upsert_customer(body: CustomerUpsert, vendor=Depends(get_current_vendor)):
    """Called automatically after every invoice is generated."""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    # Try to find existing customer by phone (primary) or name
    existing = None
    if body.phone:
        res = (
            db.table("customers")
            .select("*")
            .eq("vendor_id", vendor["id"])
            .eq("phone", body.phone)
            .execute()
        )
        if res.data:
            existing = res.data[0]

    if not existing:
        res = (
            db.table("customers")
            .select("*")
            .eq("vendor_id", vendor["id"])
            .eq("name", body.name)
            .execute()
        )
        if res.data:
            existing = res.data[0]

    if existing:
        # Update existing customer
        updated = db.table("customers").update({
            "name":         body.name,
            "phone":        body.phone or existing["phone"],
            "gstin":        body.gstin or existing["gstin"],
            "total_spent":  round((existing["total_spent"] or 0) + body.amount, 2),
            "visit_count":  (existing["visit_count"] or 0) + 1,
            "last_visited": now,
            "updated_at":   now,
        }).eq("id", existing["id"]).execute()
        return updated.data[0]
    else:
        # Create new customer
        created = db.table("customers").insert({
            "vendor_id":    vendor["id"],
            "name":         body.name,
            "phone":        body.phone,
            "gstin":        body.gstin,
            "total_spent":  body.amount,
            "visit_count":  1,
            "last_visited": now,
        }).execute()
        return created.data[0]


@router.get("/{customer_id}")
async def get_customer(customer_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    result = (
        db.table("customers")
        .select("*")
        .eq("id", customer_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result.data[0]


@router.get("/{customer_id}/invoices")
async def customer_invoices(customer_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    # Get customer first
    cust = (
        db.table("customers")
        .select("*")
        .eq("id", customer_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not cust.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = cust.data[0]

    # Match invoices by name or phone
    q = (
        db.table("invoices")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .order("created_at", desc=True)
    )

    # Invoices store customer_name only — match by name
    result = q.eq("customer_name", customer["name"]).execute()
    return result.data


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    existing = (
        db.table("customers")
        .select("id")
        .eq("id", customer_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.table("customers").delete().eq("id", customer_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Customer removed"}


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


@router.patch("/{customer_id}")
async def update_customer(
    customer_id: str,
    body: CustomerUpdate,
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    existing = (
        db.table("customers")
        .select("id")
        .eq("id", customer_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    result = db.table("customers").update(updates).eq("id", customer_id).eq("vendor_id", vendor["id"]).execute()
    return result.data[0]
