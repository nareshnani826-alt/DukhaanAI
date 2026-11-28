"""
Move a shop's phone-only data (used without an account, or on the Free plan) into its Pro account.

POST /migrate/import  { kirana: <localStorage "dukaanai_data">, chai: <localStorage "dk_chai"> }

Keeps original dates (bills, sales, khata, wastage) and the links between records (bill → product,
khata entry → bill, chai order → khata customer). Each part is skipped when the account already has
that kind of data, so sending the same phone data twice never makes duplicates. Owner only.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.cache import cache_bust
from app.core.database import get_db
from app.core.security import bust_vendor_cache, get_current_vendor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/migrate", tags=["migrate"])

GST_RATES = (0, 5, 12, 18, 28)
PAY_INVOICE = {"cash": "Cash", "upi": "UPI", "credit": "Credit", "cheque": "Cheque"}


class ImportBody(BaseModel):
    kirana: Optional[dict[str, Any]] = None
    chai: Optional[dict[str, Any]] = None


def _ts(v) -> str:
    """A stored date, or now if it's missing or unreadable."""
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def _num(v, default=0.0) -> float:
    try:
        return float(v)
    except Exception:
        return default


def _gst(v) -> int:
    n = int(round(_num(v)))
    return n if n in GST_RATES else min(GST_RATES, key=lambda r: abs(r - n))


def _has(db, table: str, vendor_id: str) -> bool:
    return bool(db.table(table).select("id").eq("vendor_id", vendor_id).limit(1).execute().data)


def _insert_many(db, table: str, rows: list[dict], chunk: int = 200) -> list[dict]:
    out: list[dict] = []
    for i in range(0, len(rows), chunk):
        out += db.table(table).insert(rows[i:i + chunk]).execute().data or []
    return out


def _insert_mapped(db, table: str, items: list[tuple[str, dict]]) -> dict[str, str]:
    """Insert rows one chunk at a time and return {old local id: new server id} (insert keeps order)."""
    ids: dict[str, str] = {}
    for i in range(0, len(items), 200):
        part = items[i:i + 200]
        made = db.table(table).insert([r for _, r in part]).execute().data or []
        for (old, _), new in zip(part, made):
            ids[str(old)] = new["id"]
    return ids


@router.post("/import")
def import_local(body: ImportBody, vendor=Depends(get_current_vendor)):
    db, vid = get_db(), vendor["id"]
    done: dict[str, int] = {}
    skipped: list[str] = []
    k = body.kirana or {}
    c = body.chai or {}

    # ── Products ──
    prod_map: dict[str, str] = {}
    products = [p for p in (k.get("products") or []) if p.get("name")]
    if products:
        if _has(db, "products", vid):
            skipped.append("products")
            for p in db.table("products").select("id,name").eq("vendor_id", vid).execute().data or []:
                prod_map.setdefault("name:" + p["name"].strip().lower(), p["id"])   # link bills by name instead
        else:
            seen_sku: set = set()
            rows = []
            for p in products:
                sku = (str(p.get("sku")).strip() or None) if p.get("sku") else None
                if sku in seen_sku:
                    sku = None
                if sku:
                    seen_sku.add(sku)
                rows.append((p.get("id"), {
                    "vendor_id": vid, "name": str(p["name"])[:120], "sku": sku, "category": p.get("category"),
                    "unit": p.get("unit") or "pc", "stock": max(0.0, _num(p.get("stock"))),
                    "min_stock": max(0.0, _num(p.get("min_stock"), 10)), "mrp": max(0.0, _num(p.get("mrp"))),
                    "cost_price": max(0.0, _num(p.get("cost_price"))), "gst_percent": _gst(p.get("gst_percent")),
                    "is_active": p.get("is_active") is not False, "created_at": _ts(p.get("created_at")),
                }))
            prod_map = _insert_mapped(db, "products", rows)
            done["products"] = len(prod_map)

    def pid(old_id, name=None):
        return prod_map.get(str(old_id)) or (prod_map.get("name:" + str(name).strip().lower()) if name else None)

    # ── Bills (+ the sales rows reports are built from) ──
    inv_map: dict[str, str] = {}
    invoices = k.get("invoices") or []
    if invoices:
        if _has(db, "invoices", vid):
            skipped.append("bills")
        else:
            rows = []
            for inv in invoices:
                items = []
                for it in inv.get("items") or []:
                    it = dict(it)
                    it["product_id"] = pid(it.get("product_id"), it.get("name"))
                    items.append(it)
                rows.append((inv.get("id"), {
                    "vendor_id": vid, "invoice_no": str(inv.get("invoice_no") or "INV")[:30],
                    "customer_name": str(inv.get("customer_name") or "Walk-in")[:80],
                    "customer_phone": inv.get("customer_phone"), "customer_gstin": inv.get("customer_gstin"),
                    "payment_mode": PAY_INVOICE.get(str(inv.get("payment_mode") or "cash").lower(), "Cash"),
                    "subtotal": _num(inv.get("subtotal")), "cgst": _num(inv.get("cgst")), "sgst": _num(inv.get("sgst")),
                    "total": _num(inv.get("total")), "items": items,
                    "status": inv.get("status") if inv.get("status") in ("paid", "pending", "cancelled") else "paid",
                    "created_at": _ts(inv.get("created_at")),
                }))
            inv_map = _insert_mapped(db, "invoices", rows)
            done["bills"] = len(inv_map)
            sales = []
            for _, r in rows:
                if r["status"] == "cancelled":
                    continue
                for it in r["items"]:
                    if it.get("product_id") and _num(it.get("qty")) > 0:
                        sales.append({"vendor_id": vid, "product_id": it["product_id"], "product_name": it.get("name"),
                                      "qty": _num(it.get("qty")), "unit_price": _num(it.get("unit_price")),
                                      "total": _num(it.get("total"), _num(it.get("unit_price")) * _num(it.get("qty"))),
                                      "customer": r["customer_name"], "payment_mode": r["payment_mode"], "sold_at": r["created_at"]})
            # Older one-tap sales saved on the phone
            for s in k.get("sales") or []:
                p_id = pid(s.get("product_id"), s.get("product_name"))
                if p_id and _num(s.get("qty")) > 0:
                    sales.append({"vendor_id": vid, "product_id": p_id, "product_name": s.get("product_name"),
                                  "qty": _num(s.get("qty")), "unit_price": _num(s.get("unit_price")), "total": _num(s.get("total")),
                                  "customer": s.get("customer") or "Walk-in",
                                  "payment_mode": PAY_INVOICE.get(str(s.get("payment_mode") or "cash").lower(), "Cash"),
                                  "sold_at": _ts(s.get("sold_at"))})
            if sales:
                _insert_many(db, "sales", sales)
                done["sales"] = len(sales)

    # ── Customers ──
    customers = [x for x in (k.get("customers") or []) if x.get("name")]
    if customers:
        if _has(db, "customers", vid):
            skipped.append("customers")
        else:
            _insert_many(db, "customers", [{
                "vendor_id": vid, "name": str(x["name"])[:80], "phone": x.get("phone"), "address": x.get("address"),
                "gstin": x.get("gstin"), "notes": x.get("notes"), "visit_count": int(_num(x.get("visit_count"))),
                "total_spent": _num(x.get("total_spent")), "last_visited": x.get("last_visited"),
                "created_at": _ts(x.get("created_at")),
            } for x in customers])
            done["customers"] = len(customers)

    # ── Khata ──
    udhar_map: dict[str, str] = {}
    ucust = [x for x in (k.get("udhar_customers") or []) if x.get("name")]
    if ucust:
        if _has(db, "udhar_customers", vid):
            skipped.append("khata")
        else:
            udhar_map = _insert_mapped(db, "udhar_customers", [(x.get("id"), {
                "vendor_id": vid, "name": str(x["name"])[:80], "phone": x.get("phone"), "address": x.get("address"),
                "total_due": max(0.0, _num(x.get("total_due"))), "last_txn_at": x.get("last_txn_at"),
                "created_at": _ts(x.get("created_at")),
            }) for x in ucust])
            done["khata customers"] = len(udhar_map)
            txns = [{
                "vendor_id": vid, "customer_id": udhar_map[str(t["customer_id"])],
                "type": t.get("type") if t.get("type") in ("credit", "payment") else "credit",
                "amount": abs(_num(t.get("amount"))), "note": t.get("note"),
                "invoice_id": inv_map.get(str(t.get("invoice_id"))) if t.get("invoice_id") else None,
                "created_at": _ts(t.get("created_at")),
            } for t in (k.get("udhar_txns") or []) if str(t.get("customer_id")) in udhar_map and _num(t.get("amount")) > 0]
            if txns:
                _insert_many(db, "udhar_transactions", txns)
                done["khata entries"] = len(txns)

    # ── Wastage ──
    wastage = k.get("wastage_records") or []
    if wastage:
        if _has(db, "wastage_records", vid):
            skipped.append("wastage")
        else:
            rows = [{
                "vendor_id": vid, "product_id": pid(w.get("product_id"), w.get("product_name")),
                "product_name": w.get("product_name"), "qty": _num(w.get("qty")), "unit": w.get("unit"),
                "reason": w.get("reason") if w.get("reason") in ("expired", "damaged", "stolen", "other") else "other", "note": w.get("note"), "loss_value": _num(w.get("loss_value")),
                "stock_before": w.get("stock_before"), "stock_after": w.get("stock_after"), "created_at": _ts(w.get("created_at")),
            } for w in wastage if _num(w.get("qty")) > 0]
            rows = [r for r in rows if r["product_id"]]
            if rows:
                _insert_many(db, "wastage_records", rows)
                done["wastage"] = len(rows)

    # ── Chai: raw materials, menu, orders ──
    if c.get("menu") or c.get("orders"):
        if _has(db, "chai_menu", vid) or _has(db, "chai_orders", vid):
            skipped.append("chai")
        else:
            mat_map = _insert_mapped(db, "chai_materials", [(m.get("id"), {
                "vendor_id": vid, "name": str(m.get("name") or "Item")[:60], "unit": m.get("unit") or "pc",
                "stock": max(0.0, _num(m.get("stock"))), "min_stock": max(0.0, _num(m.get("min_stock"))),
                "cost_per_unit": max(0.0, _num(m.get("cost_per_unit"))),
            }) for m in (c.get("materials") or [])])
            menu_map = _insert_mapped(db, "chai_menu", [(m.get("id"), {
                "vendor_id": vid, "name": str(m.get("name") or "Item")[:60], "category": m.get("category") or "Tea",
                "price": max(0.0, _num(m.get("price"))), "emoji": m.get("emoji"), "sort": int(_num(m.get("sort"))),
                "active": m.get("active") is not False, "buy_price": max(0.0, _num(m.get("buy_price"))),
                "recipe": [[mat_map[str(r[0])], r[1]] for r in (m.get("recipe") or []) if isinstance(r, list) and len(r) == 2 and str(r[0]) in mat_map],
            }) for m in (c.get("menu") or [])])
            orders = []
            for o in c.get("orders") or []:
                items = [{**it, "menu_id": menu_map.get(str(it.get("menu_id")))} for it in (o.get("items") or [])]
                mode = str(o.get("payment_mode") or "").lower() or None
                orders.append({
                    "vendor_id": vid, "order_no": int(_num(o.get("order_no"), 1)),
                    "kind": o.get("kind") if o.get("kind") in ("counter", "table") else "counter", "label": o.get("label"),
                    "items": items, "total": _num(o.get("total")),
                    "status": o.get("status") if o.get("status") in ("open", "paid", "cancelled") else "paid",
                    "payment_mode": mode if mode in ("cash", "upi", "credit") else None,
                    "customer_id": udhar_map.get(str(o.get("customer_id"))) if o.get("customer_id") else None,
                    "customer_name": o.get("customer_name"),
                    "created_at": _ts(o.get("created_at")), "paid_at": o.get("paid_at"),
                })
            if orders:
                _insert_many(db, "chai_orders", orders)
            done["chai menu"], done["chai orders"] = len(menu_map), len(orders)

    cache_bust(f"products:{vid}:")
    bust_vendor_cache(vid)
    logger.info("migrate vendor=%s done=%s skipped=%s", vid, done, skipped)
    if not done and not skipped:
        raise HTTPException(status_code=400, detail="Nothing to move — this phone has no saved shop data.")
    return {"moved": done, "skipped": skipped}
