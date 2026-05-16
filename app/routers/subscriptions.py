import hmac
import hashlib
import json
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import JSONResponse

from app.core.config import settings, PLAN_PRICING
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.schemas.schemas import SubscriptionCreate, SubscriptionOut

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

RAZORPAY_BASE = "https://api.razorpay.com/v1"


async def _rz_post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{RAZORPAY_BASE}{path}",
            json=body,
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            timeout=15,
        )
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Razorpay error: {r.text}")
    return r.json()


async def _rz_cancel(sub_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{RAZORPAY_BASE}/subscriptions/{sub_id}/cancel",
            json={"cancel_at_cycle_end": 1},
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            timeout=15,
        )
    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Razorpay error: {r.text}")
    return r.json()


def _get_plan_id(plan: str, billing_cycle: str) -> str:
    mapping = {
        ("pro", "monthly"):       settings.razorpay_pro_monthly_plan_id,
        ("pro", "yearly"):        settings.razorpay_pro_yearly_plan_id,
        ("wholesale", "monthly"): settings.razorpay_wholesale_monthly_plan_id,
        ("wholesale", "yearly"):  settings.razorpay_wholesale_yearly_plan_id,
    }
    plan_id = mapping.get((plan, billing_cycle))
    if not plan_id:
        raise HTTPException(status_code=400, detail="Invalid plan or billing cycle")
    return plan_id


@router.get("/plans")
async def list_plans():
    return {
        "plans": [
            {"id": "free", "name": "Local (Free)", "price_monthly": 0, "price_yearly": 0,
             "features": ["Full inventory management", "GST invoice generation", "AI agent (local logic)", "Single device only"]},
            {"id": "pro", "name": "Pro", "price_monthly": 299, "price_yearly": 2390,
             "features": ["Everything in Free", "Cloud sync + auto backup", "Up to 3 devices", "Real AI (Claude API)", "WhatsApp invoice share", "Email support"]},
            {"id": "wholesale", "name": "Wholesale", "price_monthly": 999, "price_yearly": 7990,
             "features": ["Everything in Pro", "Unlimited staff accounts", "Multi-branch support", "Tally / Busy integration", "99.9% SLA uptime"]},
        ]
    }


@router.post("/create", response_model=SubscriptionOut, status_code=201)
async def create_subscription(body: SubscriptionCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    plan_id = _get_plan_id(body.plan, body.billing_cycle)
    pricing = PLAN_PRICING[body.plan][body.billing_cycle]

    rz_sub = await _rz_post("/subscriptions", {
        "plan_id": plan_id,
        "customer_notify": 1,
        "quantity": 1,
        "total_count": 12 if body.billing_cycle == "monthly" else 1,
        "notes": {"vendor_id": vendor["id"], "store_name": vendor["store_name"], "plan": body.plan},
    })

    sub = db.table("subscriptions").insert({
        "vendor_id": vendor["id"],
        "razorpay_sub_id": rz_sub["id"],
        "razorpay_plan_id": plan_id,
        "plan": body.plan,
        "billing_cycle": body.billing_cycle,
        "amount": pricing["amount"] / 100,
        "status": rz_sub["status"],
    }).execute().data[0]
    return sub


@router.get("/me", response_model=list[SubscriptionOut])
async def my_subscriptions(vendor=Depends(get_current_vendor)):
    db = get_db()
    return db.table("subscriptions").select("*").eq("vendor_id", vendor["id"]).order("created_at", desc=True).execute().data


@router.post("/cancel")
async def cancel_subscription(vendor=Depends(get_current_vendor)):
    db = get_db()
    active = db.table("subscriptions").select("*").eq("vendor_id", vendor["id"]).eq("status", "active").execute()
    if not active.data:
        raise HTTPException(status_code=404, detail="No active subscription found")
    sub = active.data[0]
    await _rz_cancel(sub["razorpay_sub_id"])
    db.table("subscriptions").update({"status": "cancelled"}).eq("id", sub["id"]).execute()
    return {"message": "Subscription cancelled. Access continues until end of current period."}


@router.post("/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(...)):
    db = get_db()
    body_bytes = await request.body()
    expected = hmac.new(settings.razorpay_webhook_secret.encode(), body_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body_bytes)
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    rz_sub_id = entity.get("id")
    vendor_id = entity.get("notes", {}).get("vendor_id")

    db.table("payment_events").insert({"vendor_id": vendor_id, "event_type": event, "razorpay_sub_id": rz_sub_id, "payload": payload}).execute()

    if event in ("subscription.activated", "subscription.charged"):
        _activate_vendor(db, rz_sub_id, vendor_id)
    elif event in ("subscription.cancelled", "subscription.expired", "subscription.halted"):
        _deactivate_vendor(db, rz_sub_id, vendor_id)

    return JSONResponse({"status": "ok"})


def _activate_vendor(db, rz_sub_id: str, vendor_id: str):
    sub_row = db.table("subscriptions").select("*").eq("razorpay_sub_id", rz_sub_id).execute()
    if not sub_row.data:
        return
    sub = sub_row.data[0]
    expires = datetime.now(timezone.utc) + timedelta(days=32 if sub["billing_cycle"] == "monthly" else 366)
    db.table("vendors").update({"plan": sub["plan"], "plan_expires_at": expires.isoformat()}).eq("id", vendor_id).execute()
    db.table("subscriptions").update({"status": "active", "current_start": datetime.now(timezone.utc).isoformat(), "current_end": expires.isoformat()}).eq("razorpay_sub_id", rz_sub_id).execute()


def _deactivate_vendor(db, rz_sub_id: str, vendor_id: str):
    if vendor_id:
        db.table("vendors").update({"plan": "free", "plan_expires_at": None}).eq("id", vendor_id).execute()
    db.table("subscriptions").update({"status": "cancelled"}).eq("razorpay_sub_id", rz_sub_id).execute()
