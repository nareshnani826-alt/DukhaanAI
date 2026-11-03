"""Profit from bills: each item's sale amount (before GST) minus its product's cost price.

Works on the bills themselves, so a cancelled bill (or one filtered out by a search or
date range) leaves both its sales and its cost out of the result.
"""


def _line_sale(item: dict) -> float:
    return float(item.get("subtotal") or 0) or float(item.get("unit_price") or 0) * float(item.get("qty") or 0)


def bill_profit(db, vendor_id: str, bills: list[dict], cost_of: dict[str, float] | None = None) -> dict:
    """Profit summary for the given invoice rows (cancelled ones are skipped).

    Returns revenue (bill totals incl. GST), sales_ex_gst, profit and margin_pct (both None when
    no sold item has a cost price), plus cost_coverage — the share of sold items with a cost price.
    """
    paid = [b for b in bills if b.get("status") != "cancelled"]
    items = [it for b in paid for it in (b.get("items") or [])]
    pids = list({str(it["product_id"]) for it in items if it.get("product_id")})
    # Callers that already loaded the products pass their cost prices; only products missing
    # from it (e.g. since removed from stock) are fetched
    cost_of = dict(cost_of or {})
    missing = [pid for pid in pids if pid not in cost_of]
    if missing:
        rows = (db.table("products").select("id,cost_price")
                .in_("id", missing).eq("vendor_id", vendor_id).execute().data or [])
        cost_of.update({str(p["id"]): float(p.get("cost_price") or 0) for p in rows})

    costed = [it for it in items if cost_of.get(str(it.get("product_id") or ""), 0) > 0]
    costed_sales = round(sum(_line_sale(it) for it in costed), 2)
    cost = round(sum(float(it.get("qty") or 0) * cost_of[str(it["product_id"])] for it in costed), 2)
    known = bool(costed)
    profit = round(costed_sales - cost, 2) if known else None

    # Products sold below their cost price — usually a wrong cost price, and the reason a
    # profit figure goes negative. Grouped per product, biggest loss first.
    losses: dict[str, dict] = {}
    for it in costed:
        qty = float(it.get("qty") or 0)
        line_loss = _line_sale(it) - cost_of[str(it["product_id"])] * qty
        if line_loss < -0.005 and qty > 0:
            e = losses.setdefault(str(it["product_id"]), {
                "name": it.get("name") or "", "cost_price": cost_of[str(it["product_id"])],
                "sold_at": round(_line_sale(it) / qty, 2), "qty": 0.0, "loss": 0.0})
            e["qty"] += qty
            e["loss"] += line_loss
    loss_items = sorted(({**e, "qty": round(e["qty"], 3), "loss": round(e["loss"], 2)} for e in losses.values()),
                        key=lambda e: e["loss"])[:5]

    return {
        "revenue":       round(sum(float(b.get("total") or 0) for b in paid), 2),
        "sales_ex_gst":  round(sum(_line_sale(it) for it in items), 2),
        "profit":        profit,
        "margin_pct":    round(profit / costed_sales * 100, 1) if known and costed_sales > 0 else None,
        "cost_coverage": len(costed) / len(items) if items else 0,
        "bills":         len(paid),
        "loss_items":    loss_items,
    }
