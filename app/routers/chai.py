"""Chai shop: menu with per-cup recipes, raw materials, counter and table/token orders.

Mirrors frontend/src/sync/chaiDb.js, which does the same on the phone for shops without
a cloud plan. Credit sales are written to the khata by the app through /udhar.
"""
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/chai", tags=["chai"])

STARTER_MATERIALS = [
    ("milk", "Milk", "L", 5, 60), ("sugar", "Sugar", "kg", 2, 44),
    ("tea", "Tea powder", "kg", 0.5, 360), ("coffee", "Coffee powder", "kg", 0.25, 600),
    ("ginger", "Ginger", "kg", 0.25, 120), ("cups", "Paper cups", "pc", 100, 0.6),
]
_TEA = [["milk", 0.08], ["sugar", 0.012], ["tea", 0.004], ["cups", 1]]
STARTER_MENU = [
    ("Tea", "Tea", 12, "☕", _TEA), ("Ginger Tea", "Tea", 15, "🫚", _TEA + [["ginger", 0.003]]),
    ("Elaichi Tea", "Tea", 15, "🍵", _TEA),
    ("Lemon Tea", "Tea", 15, "🍋", [["sugar", 0.012], ["tea", 0.003], ["cups", 1]]),
    ("Black Tea", "Tea", 10, "🫖", [["sugar", 0.012], ["tea", 0.004], ["cups", 1]]),
    ("Coffee", "Coffee", 20, "☕", [["milk", 0.1], ["sugar", 0.012], ["coffee", 0.005], ["cups", 1]]),
    ("Boost", "Coffee", 25, "🥛", [["milk", 0.12], ["cups", 1]]),
    ("Badam Milk", "Coffee", 25, "🥛", [["milk", 0.15], ["sugar", 0.015], ["cups", 1]]),
    ("Osmania Biscuit", "Snacks", 5, "🍪", []), ("Samosa", "Snacks", 15, "🥟", []),
    ("Bun", "Snacks", 15, "🍞", []), ("Puff", "Snacks", 25, "🥐", []),
    ("Mirchi Bajji", "Snacks", 20, "🌶️", []), ("Water Bottle", "Other", 20, "💧", []),
]


class MenuItem(BaseModel):
    name:     Optional[str] = None
    category: Optional[str] = None
    price:    Optional[float] = None
    emoji:    Optional[str] = None
    sort:     Optional[int] = None
    recipe:   Optional[list] = None


class Material(BaseModel):
    name:          Optional[str] = None
    unit:          Optional[str] = None
    stock:         Optional[float] = None
    min_stock:     Optional[float] = None
    cost_per_unit: Optional[float] = None


class StockChange(BaseModel):
    qty: float


class OrderItem(BaseModel):
    menu_id: Optional[str] = None
    name:    str
    price:   float
    qty:     float


class OpenOrder(BaseModel):
    kind:  str = "table"
    label: Optional[str] = None
    items: list[OrderItem] = []


class OrderUpdate(BaseModel):
    label: Optional[str] = None
    items: Optional[list[OrderItem]] = None


class PayOrder(BaseModel):
    id:            Optional[str] = None
    label:         Optional[str] = None
    items:         list[OrderItem]
    payment_mode:  str
    customer_id:   Optional[str] = None
    customer_name: Optional[str] = None


def _total(items: list[dict]) -> float:
    return round(sum(float(i["price"]) * float(i["qty"]) for i in items), 2)


def _materials_used(items: list[dict], menu: list[dict]) -> dict[str, float]:
    recipe_of = {m["id"]: m.get("recipe") or [] for m in menu}
    used: dict[str, float] = {}
    for it in items:
        for mid, q in recipe_of.get(it.get("menu_id") or "", []):
            used[mid] = round(used.get(mid, 0) + float(q) * float(it["qty"]), 4)
    return used


def _adjust_stock(db, vendor_id: str, used: dict[str, float], sign: int) -> None:
    if not used:
        return
    rows = db.table("chai_materials").select("id,stock").eq("vendor_id", vendor_id).in_("id", list(used)).execute().data or []
    for r in rows:
        new = max(0, round(float(r["stock"] or 0) + sign * used[r["id"]], 4))
        db.table("chai_materials").update({"stock": new}).eq("id", r["id"]).execute()


def _seed(db, vendor_id: str) -> None:
    mats = db.table("chai_materials").insert([
        {"vendor_id": vendor_id, "name": n, "unit": u, "min_stock": mn, "cost_per_unit": c}
        for _, n, u, mn, c in STARTER_MATERIALS]).execute().data
    id_of = {key: m["id"] for (key, *_), m in zip(STARTER_MATERIALS, mats)}
    db.table("chai_menu").insert([
        {"vendor_id": vendor_id, "name": n, "category": cat, "price": p, "emoji": e, "sort": i,
         "recipe": [[id_of[k], q] for k, q in r]}
        for i, (n, cat, p, e, r) in enumerate(STARTER_MENU)]).execute()


def _active_menu(db, vendor_id: str) -> list[dict]:
    return (db.table("chai_menu").select("*").eq("vendor_id", vendor_id).eq("active", True)
            .order("sort").execute().data or [])


# ── Menu ──────────────────────────────────────────────────

@router.get("/menu")
def list_menu(vendor=Depends(get_current_vendor)):
    db = get_db()
    # First visit: give the shop a ready menu and the usual raw materials
    if not db.table("chai_menu").select("id").eq("vendor_id", vendor["id"]).limit(1).execute().data:
        _seed(db, vendor["id"])
    return _active_menu(db, vendor["id"])


@router.post("/menu", status_code=201)
def add_menu_item(body: MenuItem, vendor=Depends(get_current_vendor)):
    if not body.name or body.price is None:
        raise HTTPException(status_code=400, detail="Name and price are needed")
    row = {k: v for k, v in body.model_dump().items() if v is not None}
    return get_db().table("chai_menu").insert({**row, "vendor_id": vendor["id"]}).execute().data[0]


@router.patch("/menu/{item_id}")
def update_menu_item(item_id: str, body: MenuItem, vendor=Depends(get_current_vendor)):
    row = {k: v for k, v in body.model_dump().items() if v is not None}
    res = get_db().table("chai_menu").update(row).eq("id", item_id).eq("vendor_id", vendor["id"]).execute().data
    if not res:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return res[0]


@router.delete("/menu/{item_id}")
def remove_menu_item(item_id: str, vendor=Depends(get_current_vendor)):
    # Kept for old bills; just hidden from the menu
    get_db().table("chai_menu").update({"active": False}).eq("id", item_id).eq("vendor_id", vendor["id"]).execute()
    return {"ok": True}


# ── Raw materials ─────────────────────────────────────────

@router.get("/materials")
def list_materials(vendor=Depends(get_current_vendor)):
    return (get_db().table("chai_materials").select("*").eq("vendor_id", vendor["id"])
            .order("created_at").execute().data or [])


@router.post("/materials", status_code=201)
def add_material(body: Material, vendor=Depends(get_current_vendor)):
    if not body.name:
        raise HTTPException(status_code=400, detail="Name is needed")
    row = {k: v for k, v in body.model_dump().items() if v is not None}
    return get_db().table("chai_materials").insert({**row, "vendor_id": vendor["id"]}).execute().data[0]


@router.patch("/materials/{mat_id}")
def update_material(mat_id: str, body: Material, vendor=Depends(get_current_vendor)):
    row = {k: v for k, v in body.model_dump().items() if v is not None}
    res = get_db().table("chai_materials").update(row).eq("id", mat_id).eq("vendor_id", vendor["id"]).execute().data
    if not res:
        raise HTTPException(status_code=404, detail="Material not found")
    return res[0]


@router.post("/materials/{mat_id}/stock")
def change_material_stock(mat_id: str, body: StockChange, vendor=Depends(get_current_vendor)):
    db = get_db()
    cur = db.table("chai_materials").select("stock").eq("id", mat_id).eq("vendor_id", vendor["id"]).execute().data
    if not cur:
        raise HTTPException(status_code=404, detail="Material not found")
    new = max(0, round(float(cur[0]["stock"] or 0) + body.qty, 4))
    return db.table("chai_materials").update({"stock": new}).eq("id", mat_id).execute().data[0]


@router.delete("/materials/{mat_id}")
def remove_material(mat_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    db.table("chai_materials").delete().eq("id", mat_id).eq("vendor_id", vendor["id"]).execute()
    for m in _active_menu(db, vendor["id"]):
        recipe = [r for r in (m.get("recipe") or []) if r[0] != mat_id]
        if len(recipe) != len(m.get("recipe") or []):
            db.table("chai_menu").update({"recipe": recipe}).eq("id", m["id"]).execute()
    return {"ok": True}


# ── Orders ────────────────────────────────────────────────

IST = timezone(timedelta(hours=5, minutes=30))


def _ist_bound(day: str, end: bool = False) -> str:
    """Start (or end) of a shop day as a UTC timestamp. Written with "Z", since a "+05:30"
    offset in a query string can arrive as a space."""
    t = datetime.combine(date.fromisoformat(day), time.max if end else time.min, IST)
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _next_no(db, vendor_id: str) -> int:
    last = (db.table("chai_orders").select("order_no").eq("vendor_id", vendor_id)
            .order("order_no", desc=True).limit(1).execute().data)
    return (last[0]["order_no"] if last else 0) + 1


@router.get("/orders")
def list_orders(
    vendor=Depends(get_current_vendor),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    status: Optional[str] = None,
):
    q = get_db().table("chai_orders").select("*").eq("vendor_id", vendor["id"])
    if from_:
        q = q.gte("created_at", _ist_bound(from_))
    if to:
        q = q.lte("created_at", _ist_bound(to, end=True))
    if status:
        q = q.eq("status", status)
    return q.order("created_at", desc=True).limit(2000).execute().data or []


@router.post("/orders", status_code=201)
def open_order(body: OpenOrder, vendor=Depends(get_current_vendor)):
    db = get_db()
    items = [i.model_dump() for i in body.items]
    return db.table("chai_orders").insert({
        "vendor_id": vendor["id"], "order_no": _next_no(db, vendor["id"]), "kind": "table",
        "label": body.label, "items": items, "total": _total(items), "status": "open",
    }).execute().data[0]


@router.patch("/orders/{order_id}")
def update_order(order_id: str, body: OrderUpdate, vendor=Depends(get_current_vendor)):
    row: dict = {}
    if body.label is not None:
        row["label"] = body.label
    if body.items is not None:
        row["items"] = [i.model_dump() for i in body.items]
        row["total"] = _total(row["items"])
    res = (get_db().table("chai_orders").update(row).eq("id", order_id).eq("vendor_id", vendor["id"])
           .eq("status", "open").execute().data)
    if not res:
        raise HTTPException(status_code=404, detail="Open order not found")
    return res[0]


@router.post("/orders/pay")
def pay_order(body: PayOrder, vendor=Depends(get_current_vendor)):
    if body.payment_mode not in ("cash", "upi", "credit"):
        raise HTTPException(status_code=400, detail="Payment must be cash, upi or credit")
    if body.payment_mode == "credit" and not body.customer_id:
        raise HTTPException(status_code=400, detail="Pick the customer for a credit bill")
    if not body.items:
        raise HTTPException(status_code=400, detail="The bill is empty")
    db = get_db()
    items = [i.model_dump() for i in body.items]
    fields = {
        "items": items, "total": _total(items), "status": "paid", "payment_mode": body.payment_mode,
        "paid_at": datetime.now(timezone.utc).isoformat(),
        "customer_id": body.customer_id, "customer_name": body.customer_name,
    }
    if body.id:
        res = (db.table("chai_orders").update(fields).eq("id", body.id).eq("vendor_id", vendor["id"])
               .eq("status", "open").execute().data)
        if not res:
            raise HTTPException(status_code=404, detail="Open order not found")
        order = res[0]
    else:
        order = db.table("chai_orders").insert({
            **fields, "vendor_id": vendor["id"], "order_no": _next_no(db, vendor["id"]),
            "kind": "counter", "label": body.label,
        }).execute().data[0]
    _adjust_stock(db, vendor["id"], _materials_used(items, _active_menu(db, vendor["id"])), -1)
    return order


@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    cur = db.table("chai_orders").select("*").eq("id", order_id).eq("vendor_id", vendor["id"]).execute().data
    if not cur:
        raise HTTPException(status_code=404, detail="Order not found")
    if cur[0]["status"] == "paid":
        # Give the raw material back
        _adjust_stock(db, vendor["id"], _materials_used(cur[0]["items"], _active_menu(db, vendor["id"])), +1)
    db.table("chai_orders").update({"status": "cancelled"}).eq("id", order_id).execute()
    return {"ok": True}
