from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.schemas.schemas import SaleCreate, SaleOut

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("", response_model=SaleOut, status_code=201)
async def record_sale(body: SaleCreate, vendor=Depends(get_current_vendor)):
    db = get_db()

    # Fetch product (must belong to this vendor)
    prod_result = (
        db.table("products")
        .select("*")
        .eq("id", str(body.product_id))
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
    )
    if not prod_result.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = prod_result.data[0]

    if product["stock"] < body.qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product['stock']} units",
        )

    total = round(product["mrp"] * body.qty, 2)

    raw_qty = float(body.qty)
    sale_qty = int(raw_qty) if raw_qty == int(raw_qty) else raw_qty
    sale = db.table("sales").insert({
        "vendor_id": vendor["id"],
        "product_id": str(body.product_id),
        "product_name": product["name"],
        "qty": sale_qty,
        "unit_price": product["mrp"],
        "total": total,
        "customer": body.customer,
        "payment_mode": body.payment_mode,
    }).execute().data[0]

    # Deduct stock atomically
    db.table("products").update({
        "stock": product["stock"] - body.qty
    }).eq("id", str(body.product_id)).execute()

    return sale


@router.get("", response_model=list[SaleOut])
async def list_sales(
    days: int = Query(30, ge=1, le=365, description="Sales from last N days"),
    product_id: str | None = Query(None),
    payment_mode: str | None = Query(None),
    limit: int = Query(100, le=500),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    q = (
        db.table("sales")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", since)
        .order("sold_at", desc=True)
        .limit(limit)
    )
    if product_id:
        q = q.eq("product_id", product_id)
    if payment_mode:
        q = q.eq("payment_mode", payment_mode)

    return q.execute().data


@router.get("/summary")
async def sales_summary(
    days: int = Query(30, ge=1, le=365),
    vendor=Depends(get_current_vendor),
):
    """Revenue, units sold, top products — for dashboard cards."""
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    sales = (
        db.table("sales")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", since)
        .execute()
        .data
    )

    total_revenue = round(sum(s["total"] for s in sales), 2)
    total_units = sum(s["qty"] for s in sales)

    # Top products by units
    from collections import defaultdict
    product_sales: dict = defaultdict(lambda: {"units": 0, "revenue": 0.0})
    for s in sales:
        product_sales[s["product_name"]]["units"] += s["qty"]
        product_sales[s["product_name"]]["revenue"] += s["total"]

    top_products = sorted(
        [{"name": k, **v} for k, v in product_sales.items()],
        key=lambda x: x["units"],
        reverse=True,
    )[:10]

    return {
        "period_days": days,
        "total_revenue": total_revenue,
        "total_units": total_units,
        "transaction_count": len(sales),
        "avg_transaction": round(total_revenue / len(sales), 2) if sales else 0,
        "top_products": top_products,
    }


@router.get("/today")
async def today_sales(vendor=Depends(get_current_vendor)):
    db = get_db()
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    sales = (
        db.table("sales")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .gte("sold_at", today_start)
        .order("sold_at", desc=True)
        .execute()
        .data
    )
    return {
        "sales": sales,
        "total": round(sum(s["total"] for s in sales), 2),
        "count": len(sales),
    }
