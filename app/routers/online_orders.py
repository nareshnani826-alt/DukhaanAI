"""
QR ordering: a customer scans the shop's QR, picks items, and places an order the owner accepts.

Public (no login, rate-limited):
  GET  /public/shops/{code}                   menu of a shop that takes online orders
  POST /public/shops/{code}/orders            place an order — prices are recalculated here
  GET  /public/orders/{order_id}?t=<token>    the customer's own order status

Owner app (signed in, Pro):
  GET   /online-orders/settings               QR code / on-off
  PATCH /online-orders/settings               turn on/off (creates the shop code the first time)
  GET   /online-orders                        open orders (new / accepted / ready), newest first
  GET   /online-orders/pending-count          how many are waiting for Accept (polled for the alert)
  POST  /online-orders/{id}/accept            chai: becomes an open order on the Tables screen
  POST  /online-orders/{id}/reject
  POST  /online-orders/{id}/ready
  POST  /online-orders/{id}/bill              kirana: makes the normal bill (stock, reports) → done
  POST  /online-orders/{id}/done              chai: payment is taken on the Tables screen
"""
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.security import get_current_vendor

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

public = APIRouter(prefix="/public", tags=["qr-ordering"])
router = APIRouter(prefix="/online-orders", tags=["qr-ordering"])

OPEN = ("new", "accepted", "ready")
MAX_OPEN_PER_PHONE = 3       # stops one number from flooding a shop
MAX_NEW_PER_SHOP = 40        # shop is "busy" past this many un-answered orders
MAX_LINES, MAX_QTY = 30, 50


# ── helpers ───────────────────────────────────────────────────

def _is_pro(v: dict) -> bool:
    from app.core.security import plan_locked
    return v.get("plan") in ("pro", "wholesale") and not plan_locked(v)


def _shop_by_code(db, code: str) -> dict:
    code = (code or "").strip().lower()
    rows = (db.table("vendors").select("id,store_name,shop_type,modules,plan,plan_expires_at,is_active,online_orders,address,phone")
            .eq("shop_code", code).execute().data) if re.fullmatch(r"[a-z0-9-]{3,40}", code or "") else []
    if not rows or not rows[0]["is_active"]:
        raise HTTPException(status_code=404, detail="Shop not found. Please scan the QR code again.")
    v = rows[0]
    if not v.get("online_orders") or not _is_pro(v):
        raise HTTPException(status_code=403, detail="This shop is not taking online orders right now.")
    return v


def _shop_type(v: dict) -> str:
    t = v.get("shop_type") or ((v.get("modules") or ["kirana"])[0])
    # A restaurant runs on the chai shop menu and Tables screen
    return "chai" if t in ("chai", "restaurant") else "kirana"


def _menu(db, v: dict) -> list[dict]:
    """What a customer may order, with the shop's current prices."""
    if _shop_type(v) == "chai":
        rows = (db.table("chai_menu").select("id,name,category,price,emoji,sort,active")
                .eq("vendor_id", v["id"]).execute().data or [])
        return [{"id": r["id"], "name": r["name"], "category": r.get("category") or "Menu",
                 "price": float(r["price"] or 0), "emoji": r.get("emoji") or "☕"}
                for r in sorted(rows, key=lambda r: (r.get("sort") or 0, r["name"]))
                if r.get("active", True) and float(r["price"] or 0) > 0]
    rows = (db.table("products").select("id,name,category,unit,mrp,stock")
            .eq("vendor_id", v["id"]).eq("is_active", True).gt("stock", 0).limit(1000).execute().data or [])
    return [{"id": r["id"], "name": r["name"], "category": r.get("category") or "Other",
             "price": float(r["mrp"] or 0), "unit": r.get("unit") or "pc", "stock": float(r["stock"] or 0)}
            for r in sorted(rows, key=lambda r: ((r.get("category") or "Other"), r["name"]))
            if float(r["mrp"] or 0) > 0]


def _digits(phone: str) -> str:
    p = re.sub(r"\D", "", phone or "")
    if len(p) == 12 and p.startswith("91"):
        p = p[2:]
    if len(p) == 11 and p.startswith("0"):
        p = p[1:]
    return p


def _next_no(db, vendor_id: str) -> int:
    rows = (db.table("online_orders").select("order_no").eq("vendor_id", vendor_id)
            .order("order_no", desc=True).limit(1).execute().data)
    return (rows[0]["order_no"] + 1) if rows else 1


def _public_view(o: dict, store_name: str = "") -> dict:
    return {k: o.get(k) for k in ("id", "order_no", "status", "mode", "table_label", "customer_name",
                                  "items", "total", "reject_reason", "created_at", "updated_at")} | {"store_name": store_name}


# ── public: menu, place order, status ────────────────────────

@public.get("/shops/{code}")
@limiter.limit("60/minute")
def shop_menu(request: Request, code: str):
    db = get_db()
    v = _shop_by_code(db, code)
    return {"store_name": v["store_name"], "shop_type": _shop_type(v), "address": v.get("address"),
            "restaurant": (v.get("shop_type") or "") == "restaurant",
            "items": _menu(db, v)}


class CartLine(BaseModel):
    id: str
    qty: float = Field(gt=0, le=MAX_QTY)


class PlaceOrder(BaseModel):
    customer_name: str = Field(min_length=1, max_length=60)
    customer_phone: str = Field(min_length=10, max_length=16)
    mode: Literal["pickup", "table"] = "pickup"
    table: Optional[str] = Field(default=None, max_length=12)
    note: Optional[str] = Field(default=None, max_length=200)
    items: list[CartLine] = Field(min_length=1, max_length=MAX_LINES)


@public.post("/shops/{code}/orders", status_code=201)
@limiter.limit("6/minute")
def place_order(request: Request, code: str, body: PlaceOrder):
    db = get_db()
    v = _shop_by_code(db, code)
    phone = _digits(body.customer_phone)
    if not re.fullmatch(r"[6-9]\d{9}", phone):
        raise HTTPException(status_code=422, detail="Enter a valid 10-digit mobile number.")
    if body.mode == "table" and not (body.table or "").strip():
        raise HTTPException(status_code=422, detail="Table number missing — please scan the table's QR again.")

    # Price every line from the shop's own list — never trust the customer's phone
    menu = {m["id"]: m for m in _menu(db, v)}
    lines, total = [], 0.0
    for c in body.items:
        m = menu.get(c.id)
        if not m:
            raise HTTPException(status_code=409, detail="An item in your cart is no longer available. Please refresh the menu.")
        qty = round(float(c.qty), 3)
        if "stock" in m and qty > m["stock"]:
            raise HTTPException(status_code=409, detail=f"Only {m['stock']:g} left of {m['name']}.")
        amount = round(m["price"] * qty, 2)
        lines.append({"id": m["id"], "name": m["name"], "price": m["price"], "qty": qty, "amount": amount})
        total += amount

    if body.mode == "table" and _shop_type(v) == "chai":
        _check_table_free(db, v["id"], body.table.strip(), phone)

    open_rows = (db.table("online_orders").select("customer_phone,status").eq("vendor_id", v["id"])
                 .in_("status", list(OPEN)).execute().data or [])
    # Waiting for the shop to answer (accepted rounds join the table bill, so they don't count)
    if sum(1 for r in open_rows if r["customer_phone"] == phone and r["status"] == "new") >= MAX_OPEN_PER_PHONE:
        raise HTTPException(status_code=429, detail="You already have orders waiting at this shop. Please wait for them first.")
    if sum(1 for r in open_rows if r["status"] == "new") >= MAX_NEW_PER_SHOP:
        raise HTTPException(status_code=429, detail="The shop is very busy right now. Please try again in a few minutes.")

    token = secrets.token_urlsafe(16)
    order = db.table("online_orders").insert({
        "vendor_id": v["id"], "order_no": _next_no(db, v["id"]), "shop_type": _shop_type(v),
        "mode": body.mode, "table_label": (body.table or "").strip() or None,
        "customer_name": body.customer_name.strip(), "customer_phone": phone,
        "note": (body.note or "").strip() or None,
        "items": lines, "total": round(total, 2), "status": "new", "access_token": token,
    }).execute().data[0]
    logger.info("online order %s #%s for vendor %s total %.2f", order["id"], order["order_no"], v["id"], total)
    return {"id": order["id"], "token": token, "order_no": order["order_no"], "total": order["total"]}


@public.get("/orders/{order_id}")
@limiter.limit("120/minute")
def order_status(request: Request, order_id: str, t: str = ""):
    db = get_db()
    rows = db.table("online_orders").select("*").eq("id", order_id).execute().data if re.fullmatch(r"[0-9a-f-]{36}", order_id) else []
    if not rows or not t or not secrets.compare_digest(rows[0]["access_token"], t):
        raise HTTPException(status_code=404, detail="Order not found.")
    store = db.table("vendors").select("store_name").eq("id", rows[0]["vendor_id"]).execute().data
    return _public_view(rows[0], store[0]["store_name"] if store else "")


# ── owner app ────────────────────────────────────────────────

def _require_pro(vendor: dict) -> None:
    if not _is_pro(vendor):
        raise HTTPException(status_code=402, detail="QR ordering needs a Pro account.")


def _new_code(db, store_name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (store_name or "shop").lower()).strip("-")[:20] or "shop"
    for _ in range(8):
        code = f"{base}-{secrets.token_hex(2)}"
        if not db.table("vendors").select("id").eq("shop_code", code).execute().data:
            return code
    return f"shop-{secrets.token_hex(4)}"


@router.get("/settings")
def get_settings(vendor=Depends(get_current_vendor)):
    row = get_db().table("vendors").select("shop_code,online_orders,shop_type,modules").eq("id", vendor["id"]).execute().data[0]
    return {"enabled": bool(row.get("online_orders")), "shop_code": row.get("shop_code"),
            "shop_type": _shop_type(row), "pro": _is_pro(vendor)}


class SettingsIn(BaseModel):
    enabled: bool


@router.patch("/settings")
def set_settings(body: SettingsIn, vendor=Depends(get_current_vendor)):
    _require_pro(vendor)
    db = get_db()
    row = db.table("vendors").select("shop_code,store_name,shop_type,modules").eq("id", vendor["id"]).execute().data[0]
    update = {"online_orders": body.enabled}
    if body.enabled and not row.get("shop_code"):
        update["shop_code"] = _new_code(db, row.get("store_name"))
    db.table("vendors").update(update).eq("id", vendor["id"]).execute()
    return {"enabled": body.enabled, "shop_code": update.get("shop_code") or row.get("shop_code"),
            "shop_type": _shop_type(row), "pro": True}


@router.get("")
def list_orders(vendor=Depends(get_current_vendor), include_done: bool = False):
    db = get_db()
    q = db.table("online_orders").select("*").eq("vendor_id", vendor["id"])
    if include_done:
        since = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        q = q.gte("created_at", since)
    else:
        q = q.in_("status", list(OPEN))
    rows = q.order("created_at", desc=True).limit(100).execute().data or []
    for r in rows:
        r.pop("access_token", None)
    return rows


@router.get("/pending-count")
def pending_count(vendor=Depends(get_current_vendor)):
    rows = (get_db().table("online_orders").select("id,order_no,created_at").eq("vendor_id", vendor["id"])
            .eq("status", "new").order("created_at", desc=True).limit(50).execute().data or [])
    return {"count": len(rows), "latest": rows[0] if rows else None}


def _get(db, vendor_id: str, order_id: str) -> dict:
    rows = db.table("online_orders").select("*").eq("id", order_id).eq("vendor_id", vendor_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Order not found")
    return rows[0]


def _set(db, order_id: str, **fields) -> dict:
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    row = db.table("online_orders").update(fields).eq("id", order_id).execute().data[0]
    row.pop("access_token", None)
    return row


# "Table 4", "table-4A", "T4" (a bare T only with a number, so "Token 5" / "Takeaway" are not tables)
_TABLE_RE = re.compile(r"^\s*(?:table\s*[-#.:]?\s*([a-z0-9]+)|t\s*[-#.:]?\s*(\d+[a-z]?))(?![a-z0-9])", re.I)


def _table_key(label: str | None) -> str | None:
    """'T1', 'Table 1', 'table-01', 'Table 1 · Online · Ravi' → '1'. Anything else (Pickup, tokens) → None."""
    m = _TABLE_RE.match(label or "")
    if not m:
        return None
    key = (m.group(1) or m.group(2)).lower()
    return key.lstrip("0") or "0"


def _check_table_free(db, vendor_id: str, table: str, phone: str) -> None:
    """A table with an unpaid bill belongs to the people sitting there: the customer whose QR orders
    are on it (same mobile) may order more; anyone else is turned away until it is paid or cancelled.
    A table the staff opened by hand ("T4") has no QR customer, so no one can add to it by QR."""
    key = _table_key(f"Table {table}")
    if not key:
        return
    bills = [b for b in (db.table("chai_orders").select("id,label").eq("vendor_id", vendor_id).eq("status", "open")
                         .execute().data or []) if _table_key(b.get("label")) == key]
    bill_ids = {b["id"] for b in bills}
    cols = "customer_phone,status,table_label,chai_order_id"
    on_bill = (db.table("online_orders").select(cols).eq("vendor_id", vendor_id).in_("chai_order_id", list(bill_ids))
               .execute().data or []) if bill_ids else []
    waiting = (db.table("online_orders").select(cols).eq("vendor_id", vendor_id).eq("status", "new")
               .execute().data or [])
    # Who is at this table: their orders are on its open bill, or still waiting to be accepted
    at_table = [r for r in on_bill if r.get("status") != "rejected"] + [
        r for r in waiting if r.get("table_label") and _table_key(f"Table {r['table_label']}") == key]
    if not bills and not at_table:
        return                                   # table is free
    if phone in {r["customer_phone"] for r in at_table}:
        return                                   # same customer ordering another round
    raise HTTPException(status_code=409, detail=f"Table {table} already has an order that isn't paid yet. "
                                                "Please ask the staff, or check you scanned the right table.")


def _merge_items(current: list[dict], new: list[dict], sign: int = 1) -> list[dict]:
    """Add (sign=1) or take away (sign=-1) dishes on a table bill; same dish + price → one line."""
    out = [dict(i) for i in current]
    for n in new:
        hit = next((i for i in out if i.get("menu_id") == n["menu_id"] and float(i["price"]) == float(n["price"])), None)
        if hit:
            hit["qty"] = round(float(hit["qty"]) + sign * float(n["qty"]), 3)
        elif sign > 0:
            out.append(dict(n))
    return [i for i in out if float(i["qty"]) > 0]


def _online_items(o: dict) -> list[dict]:
    return [{"menu_id": i["id"], "name": i["name"], "price": i["price"], "qty": i["qty"]} for i in o["items"]]


@router.post("/{order_id}/accept")
def accept(order_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    o = _get(db, vendor["id"], order_id)
    if o["status"] != "new":
        raise HTTPException(status_code=409, detail="This order was already answered.")
    extra = {}
    if o["shop_type"] == "chai":
        # Becomes part of the table's bill on the Tables screen; payment is taken there as usual.
        # A table that already has an open bill (an earlier QR order, or one the staff opened as
        # "T1" / "Table 1") gets these dishes added — one table, one bill.
        from app.routers.chai import _next_no as chai_next_no, _total as chai_total
        items = _online_items(o)
        key = _table_key(f"Table {o['table_label']}") if o.get("table_label") else None
        same_table = None
        if key:
            open_rows = (db.table("chai_orders").select("*").eq("vendor_id", vendor["id"]).eq("status", "open")
                         .order("created_at").execute().data or [])
            same_table = next((r for r in open_rows if _table_key(r.get("label")) == key), None)
        if same_table:
            merged = _merge_items(same_table.get("items") or [], items)
            db.table("chai_orders").update({"items": merged, "total": chai_total(merged)}).eq("id", same_table["id"]).execute()
            extra["chai_order_id"] = same_table["id"]
        else:
            label = (f"Table {o['table_label']}" if o.get("table_label") else "Pickup") + f" · Online · {o['customer_name']}"
            chai = db.table("chai_orders").insert({
                "vendor_id": vendor["id"], "order_no": chai_next_no(db, vendor["id"]), "kind": "table",
                "label": label[:60], "items": items, "total": chai_total(items), "status": "open",
            }).execute().data[0]
            extra["chai_order_id"] = chai["id"]
    return _set(db, order_id, status="accepted", **extra)


class RejectIn(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=120)


@router.post("/{order_id}/reject")
def reject(order_id: str, body: RejectIn | None = None, vendor=Depends(get_current_vendor)):
    db = get_db()
    o = _get(db, vendor["id"], order_id)
    if o["status"] not in OPEN:
        raise HTTPException(status_code=409, detail="This order is already closed.")
    if o.get("chai_order_id"):
        # Take only this order's dishes off the table bill (it may hold other orders too);
        # nothing left → the table bill is cancelled
        from app.routers.chai import _total as chai_total
        rows = db.table("chai_orders").select("*").eq("id", o["chai_order_id"]).eq("status", "open").execute().data or []
        if rows:
            left = _merge_items(rows[0].get("items") or [], _online_items(o), sign=-1)
            if left:
                db.table("chai_orders").update({"items": left, "total": chai_total(left)}).eq("id", rows[0]["id"]).execute()
            else:
                db.table("chai_orders").update({"status": "cancelled"}).eq("id", rows[0]["id"]).execute()
    return _set(db, order_id, status="rejected", reject_reason=(body.reason if body else None) or "Sorry, the shop can't take this order.")


@router.post("/{order_id}/ready")
def ready(order_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    o = _get(db, vendor["id"], order_id)
    if o["status"] not in ("accepted", "new"):
        raise HTTPException(status_code=409, detail="Accept the order first.")
    return _set(db, order_id, status="ready")


class BillIn(BaseModel):
    payment_mode: Literal["Cash", "UPI"] = "Cash"


@router.post("/{order_id}/bill")
def bill(order_id: str, body: BillIn, vendor=Depends(get_current_vendor)):
    """Kirana: turn the order into the normal bill (stock goes down, shows in reports and history)."""
    db = get_db()
    o = _get(db, vendor["id"], order_id)
    if o["shop_type"] != "kirana":
        raise HTTPException(status_code=400, detail="Take payment for chai orders on the Tables screen.")
    if o["status"] not in ("accepted", "ready"):
        raise HTTPException(status_code=409, detail="Accept the order first.")
    from app.routers.invoices import generate_invoice
    from app.schemas.schemas import InvoiceCreate
    prods = {p["id"]: p for p in (db.table("products").select("id,gst_percent").eq("vendor_id", vendor["id"])
                                   .in_("id", [i["id"] for i in o["items"]]).execute().data or [])}
    inv = generate_invoice(InvoiceCreate(
        customer_name=o["customer_name"], customer_phone=o["customer_phone"], payment_mode=body.payment_mode,
        items=[{"product_id": i["id"], "name": i["name"], "qty": i["qty"], "unit_price": i["price"],
                "gst_percent": float((prods.get(i["id"]) or {}).get("gst_percent") or 0)} for i in o["items"]],
    ), vendor)
    return _set(db, order_id, status="done", invoice_id=inv["id"]) | {"invoice": inv}


@router.post("/{order_id}/done")
def done(order_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    o = _get(db, vendor["id"], order_id)
    if o["status"] not in ("accepted", "ready"):
        raise HTTPException(status_code=409, detail="Accept the order first.")
    return _set(db, order_id, status="done")
