import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import settings, PLAN_PRICING
from app.core.database import get_db
from app.core.security import bust_vendor_cache, get_current_vendor
from app.schemas.schemas import SubscriptionCreate, SubscriptionOut

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

RAZORPAY_BASE = "https://api.razorpay.com/v1"
logger = logging.getLogger("dukhaanai.payments")


def _rz_fail(r: httpx.Response, action: str):
    """Razorpay said no: log its reason (never the keys) and give the shop owner a short message."""
    try:
        err = (r.json() or {}).get("error") or {}
    except ValueError:
        err = {}
    logger.warning("Razorpay %s failed: HTTP %s %s — %s (mode=%s)", action, r.status_code, err.get("code", ""),
                   err.get("description", r.text[:200]), "live" if settings.razorpay_key_id.startswith("rzp_live_") else "test")
    if r.status_code == 401:
        # Wrong / mismatched key ID and secret on the server
        raise HTTPException(status_code=503, detail="Online payment is not set up correctly. Please contact us to renew.")
    raise HTTPException(status_code=502, detail="The payment service is not answering. Please try again in a minute.")


async def _rz_post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{RAZORPAY_BASE}{path}",
            json=body,
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            timeout=15,
        )
    if r.status_code >= 400:
        _rz_fail(r, f"POST {path}")
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
        _rz_fail(r, "cancel subscription")
    return r.json()


async def _rz_get(path: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{RAZORPAY_BASE}{path}", auth=(settings.razorpay_key_id, settings.razorpay_key_secret), timeout=15)
    if r.status_code >= 400:
        _rz_fail(r, f"GET {path.split('/')[1] if '/' in path else path}")
    return r.json()


# ── Pay on the website (Razorpay Standard Checkout) ─────────────────────────
# One payment of the Pro monthly price adds PRO_DAYS to the shop's plan (on top of any days
# still left, so paying early loses nothing). The price is decided here, never by the browser.
# The Android app pays through Google Play instead (Play policy), so it never calls these.

PRO_DAYS = 30
PAID_EVENT = "checkout.paid"   # payment_events.event_type; razorpay_sub_id holds the payment id


class CheckoutVerify(BaseModel):
    razorpay_order_id:   str = Field(min_length=1, max_length=64)
    razorpay_payment_id: str = Field(min_length=1, max_length=64)
    razorpay_signature:  str = Field(min_length=1, max_length=256)


def _payments_ready() -> None:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(status_code=503, detail="Online payment is not set up yet. Please contact us to renew.")


def _extend_plan(db, vendor_id: str, payment_id: str, order: dict) -> str:
    """Add PRO_DAYS to the shop's plan for one paid order. Safe to call twice for the same payment
    (the checkout verify and the webhook can both arrive) — the second call changes nothing."""
    from app.core.security import plan_expires
    done = (db.table("payment_events").select("id").eq("event_type", PAID_EVENT)
            .eq("razorpay_sub_id", payment_id).limit(1).execute().data)
    row = db.table("vendors").select("plan_expires_at").eq("id", vendor_id).limit(1).execute().data
    current = plan_expires(row[0]) if row else None
    if done:
        return current.isoformat() if current else ""
    now = datetime.now(timezone.utc)
    new_end = max(now, current or now) + timedelta(days=PRO_DAYS)
    db.table("vendors").update({"plan": "pro", "plan_expires_at": new_end.isoformat()}).eq("id", vendor_id).execute()
    db.table("payment_events").insert({"vendor_id": vendor_id, "event_type": PAID_EVENT, "razorpay_sub_id": payment_id,
                                       "payload": {"order_id": order.get("id"), "amount": order.get("amount"),
                                                   "days": PRO_DAYS, "plan_expires_at": new_end.isoformat()}}).execute()
    bust_vendor_cache(vendor_id)
    return new_end.isoformat()


@router.post("/checkout/order", status_code=201)
async def create_checkout_order(vendor=Depends(get_current_vendor)):
    """Start a website payment for 30 days of Pro. Returns what Razorpay Checkout needs."""
    _payments_ready()
    amount = PLAN_PRICING["pro"]["monthly"]["amount"]
    order = await _rz_post("/orders", {
        "amount": amount, "currency": "INR",
        "receipt": f"pro-{vendor['id'][:8]}-{int(datetime.now(timezone.utc).timestamp())}",
        "notes": {"vendor_id": vendor["id"], "plan": "pro", "days": str(PRO_DAYS)},
    })
    return {"order_id": order["id"], "amount": order["amount"], "currency": order["currency"],
            "key_id": settings.razorpay_key_id, "days": PRO_DAYS,
            "store_name": vendor.get("store_name") or "", "email": vendor.get("email") or "", "phone": vendor.get("phone") or ""}


@router.post("/checkout/verify")
async def verify_checkout(body: CheckoutVerify, vendor=Depends(get_current_vendor)):
    """After Checkout says paid: check the signature, then confirm with Razorpay that this payment
    is for this shop's order and the full price before adding the days."""
    _payments_ready()
    expected = hmac.new(settings.razorpay_key_secret.encode(),
                        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment could not be verified. If money was taken, contact us.")

    order = await _rz_get(f"/orders/{body.razorpay_order_id}")
    payment = await _rz_get(f"/payments/{body.razorpay_payment_id}")
    price = PLAN_PRICING["pro"]["monthly"]["amount"]
    if (order.get("notes") or {}).get("vendor_id") != vendor["id"] or payment.get("order_id") != order.get("id") \
            or int(payment.get("amount") or 0) != price:
        raise HTTPException(status_code=400, detail="This payment does not belong to this shop.")
    if payment.get("status") == "authorized":   # dashboard set to manual capture: capture it now
        payment = await _rz_post(f"/payments/{payment['id']}/capture", {"amount": price, "currency": "INR"})
    if payment.get("status") != "captured":
        raise HTTPException(status_code=400, detail="The payment has not gone through yet. If money was taken, contact us.")

    expires = _extend_plan(get_db(), vendor["id"], payment["id"], order)
    return {"ok": True, "plan_expires_at": expires, "days": PRO_DAYS}


def _get_plan_id(plan: str, billing_cycle: str) -> str:
    mapping = {
        ("pro", "monthly"):       settings.razorpay_pro_monthly_plan_id,
        ("pro", "yearly"):        settings.razorpay_pro_yearly_plan_id,
    }
    plan_id = mapping.get((plan, billing_cycle))
    if not plan_id:
        raise HTTPException(status_code=400, detail="Invalid plan or billing cycle")
    return plan_id


@router.get("/plans")
async def list_plans():
    return {
        "plans": [
            {"id": "pro", "name": "Pro", "price_monthly": 299, "price_yearly": 2390,
             "trial_days": settings.trial_days,
             "features": ["Billing, stock & udhar khata", "Cloud sync + auto backup", "Voice billing in 10 languages", "AI shop assistant & invoice scanner", "Staff logins (manager, cashier)", "Reports, GST summary & data export", "WhatsApp invoice share"]},
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
def my_subscriptions(vendor=Depends(get_current_vendor)):
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
    # No secret set: an empty-key signature is easy to forge, so accept nothing
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    body_bytes = await request.body()
    expected = hmac.new(settings.razorpay_webhook_secret.encode(), body_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body_bytes)
    event = payload.get("event", "")

    # Website payment finished (also covers a customer who closed the page before the app confirmed)
    if event == "order.paid":
        order = payload.get("payload", {}).get("order", {}).get("entity", {})
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = order.get("notes") or {}
        if notes.get("plan") == "pro" and notes.get("vendor_id") and payment.get("id") \
                and int(order.get("amount_paid") or 0) == PLAN_PRICING["pro"]["monthly"]["amount"]:
            _extend_plan(db, notes["vendor_id"], payment["id"], order)
        return JSONResponse({"status": "ok"})

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
    bust_vendor_cache(vendor_id)   # unlock straight away, not after the cache runs out


def _deactivate_vendor(db, rz_sub_id: str, vendor_id: str):
    # The shop keeps Pro until the paid period ends (plan_expires_at from the last charge), then it
    # is locked until paid again — never dropped to Free, which would hide its cloud data.
    db.table("subscriptions").update({"status": "cancelled"}).eq("razorpay_sub_id", rz_sub_id).execute()
    if vendor_id:
        bust_vendor_cache(vendor_id)
