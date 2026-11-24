from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_vendor
from app.core.search import contains

router = APIRouter(prefix="/udhar", tags=["udhar"])


class CustomerCreate(BaseModel):
    name:    str
    phone:   Optional[str] = None
    address: Optional[str] = None


class TransactionCreate(BaseModel):
    customer_id: str
    type:        str  # credit | payment
    amount:      float
    note:        Optional[str] = None
    invoice_id:  Optional[str] = None


# ── Customers ─────────────────────────────────────────────

@router.get("/customers")
def list_customers(
    search: Optional[str] = Query(None),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    q = (
        db.table("udhar_customers")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .order("total_due", desc=True)
    )
    if search:
        safe = "".join(c for c in search if c.isalnum() or c in " -+.")
        q = q.or_(f"name.ilike.{contains(safe)},phone.ilike.{contains(safe)}")
    return q.execute().data


def _phone_key(phone) -> str:
    """Last 10 digits, so +91 98480 12345, 098480 12345 and 9848012345 match."""
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    return digits[-10:]


def _check_phone_free(db, vendor_id: str, phone, exclude_id: Optional[str] = None) -> None:
    """One khata customer per phone number in a shop (customers without a phone are fine)."""
    key = _phone_key(phone)
    if not key:
        return
    rows = db.table("udhar_customers").select("id,name,phone").eq("vendor_id", vendor_id).execute().data or []
    for r in rows:
        if r["id"] != exclude_id and _phone_key(r.get("phone")) == key:
            raise HTTPException(status_code=409, detail=f"{key} is already saved for {r['name']}")


@router.post("/customers", status_code=201)
def add_customer(body: CustomerCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    _check_phone_free(db, vendor["id"], body.phone)
    result = db.table("udhar_customers").insert({
        "vendor_id": vendor["id"],
        "name":      body.name,
        "phone":     body.phone,
        "address":   body.address,
        "total_due": 0,
    }).execute()
    return result.data[0]


@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    existing = db.table("udhar_customers").select("id")\
        .eq("id", customer_id).eq("vendor_id", vendor["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.table("udhar_transactions").delete().eq("customer_id", customer_id).execute()
    db.table("udhar_customers").delete().eq("id", customer_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Deleted"}


# ── Transactions ──────────────────────────────────────────

@router.get("/customers/{customer_id}/transactions")
def get_transactions(customer_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    cust = db.table("udhar_customers").select("id")\
        .eq("id", customer_id).eq("vendor_id", vendor["id"]).execute()
    if not cust.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    return (
        db.table("udhar_transactions")
        .select("*")
        .eq("customer_id", customer_id)
        .eq("vendor_id", vendor["id"])
        .order("created_at", desc=True)
        .execute()
    ).data


@router.post("/transactions", status_code=201)
def add_transaction(body: TransactionCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    if body.type not in ("credit", "payment"):
        raise HTTPException(status_code=400, detail="type must be credit or payment")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")

    # Verify customer belongs to vendor
    cust = db.table("udhar_customers").select("*")\
        .eq("id", body.customer_id).eq("vendor_id", vendor["id"]).execute()
    if not cust.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer = cust.data[0]

    # Refuse an overpayment BEFORE saving anything (it used to be saved first, then refused,
    # so the khata history showed a payment that never reduced the balance)
    current_due = float(customer["total_due"] or 0)
    if body.type == "payment" and body.amount > current_due + 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount ({body.amount}) exceeds outstanding balance ({round(current_due, 2)})"
        )

    # Insert transaction
    txn = db.table("udhar_transactions").insert({
        "vendor_id":   vendor["id"],
        "customer_id": body.customer_id,
        "type":        body.type,
        "amount":      body.amount,
        "note":        body.note,
        "invoice_id":  body.invoice_id,
    }).execute().data[0]

    # Update customer total_due
    delta    = body.amount if body.type == "credit" else -body.amount
    new_due  = max(0, round(current_due + delta, 2))
    db.table("udhar_customers").update({
        "total_due":   new_due,
        "last_txn_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", body.customer_id).execute()

    return txn


# ── Summary ───────────────────────────────────────────────

@router.get("/summary")
def summary(vendor=Depends(get_current_vendor)):
    db = get_db()
    customers = db.table("udhar_customers").select("total_due")\
        .eq("vendor_id", vendor["id"]).execute().data
    total_due     = sum(c["total_due"] or 0 for c in customers)
    overdue_count = sum(1 for c in customers if (c["total_due"] or 0) > 0)
    return {
        "total_due":      round(total_due, 2),
        "overdue_count":  overdue_count,
        "customer_count": len(customers),
    }


class CustomerUpdate(BaseModel):
    name:    Optional[str] = None
    phone:   Optional[str] = None
    address: Optional[str] = None


@router.patch("/customers/{customer_id}")
def update_customer(
    customer_id: str,
    body: CustomerUpdate,
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    existing = db.table("udhar_customers").select("id")\
        .eq("id", customer_id).eq("vendor_id", vendor["id"]).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Customer not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "phone" in updates:
        _check_phone_free(db, vendor["id"], updates["phone"], exclude_id=customer_id)
    result = db.table("udhar_customers").update(updates)\
        .eq("id", customer_id).execute()
    return result.data[0]
