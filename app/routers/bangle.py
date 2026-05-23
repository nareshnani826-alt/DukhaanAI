from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator

from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/bangle", tags=["bangle"])


# ── Schemas ───────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    category: str = "Bangles"
    description: Optional[str] = None
    mrp: float = 0
    cost_price: float = 0
    gst_percent: int = 3

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v: raise ValueError("Name cannot be empty")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    gst_percent: Optional[int] = None
    is_active: Optional[bool] = None


class VariantCreate(BaseModel):
    colour: Optional[str] = None
    size: Optional[str] = None
    design: Optional[str] = None
    stock: int = 0
    min_stock: int = 12
    mrp: Optional[float] = None
    cost_price: Optional[float] = None


class VariantUpdate(BaseModel):
    colour: Optional[str] = None
    size: Optional[str] = None
    design: Optional[str] = None
    stock: Optional[int] = None
    min_stock: Optional[int] = None
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    is_active: Optional[bool] = None


class BulkVariantCreate(BaseModel):
    colours: list[str] = []
    sizes: list[str] = []
    designs: list[str] = []
    stock_per_variant: int = 0


# ── Products ──────────────────────────────────────────────────

@router.get("/products")
async def list_products(vendor=Depends(get_current_vendor)):
    db = get_db()
    products = (
        db.table("bangle_products")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    # Attach variant summary to each product
    for p in products:
        variants = (
            db.table("bangle_variants")
            .select("id,colour,size,design,stock,min_stock,mrp,cost_price,is_active")
            .eq("product_id", p["id"])
            .eq("is_active", True)
            .execute()
        ).data or []
        p["variants"] = variants
        p["total_stock"] = sum(v["stock"] for v in variants)
        p["low_stock_count"] = sum(1 for v in variants if v["stock"] < v["min_stock"])
        p["variant_count"] = len(variants)

    return products


@router.post("/products", status_code=201)
async def create_product(body: ProductCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    row = db.table("bangle_products").insert({
        "vendor_id":   vendor["id"],
        "name":        body.name,
        "category":    body.category,
        "description": body.description,
        "mrp":         body.mrp,
        "cost_price":  body.cost_price,
        "gst_percent": body.gst_percent,
    }).execute().data[0]
    row["variants"] = []
    row["total_stock"] = 0
    row["variant_count"] = 0
    return row


@router.patch("/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, vendor=Depends(get_current_vendor)):
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        db.table("bangle_products")
        .update(updates)
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return result.data[0]


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    db.table("bangle_products").update({"is_active": False}).eq("id", product_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Product deleted"}


# ── Variants ──────────────────────────────────────────────────

@router.post("/products/{product_id}/variants", status_code=201)
async def add_variant(product_id: str, body: VariantCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    # Verify product belongs to vendor
    p = db.table("bangle_products").select("id").eq("id", product_id).eq("vendor_id", vendor["id"]).execute()
    if not p.data:
        raise HTTPException(status_code=404, detail="Product not found")

    row = db.table("bangle_variants").insert({
        "product_id": product_id,
        "vendor_id":  vendor["id"],
        "colour":     body.colour,
        "size":       body.size,
        "design":     body.design,
        "stock":      body.stock,
        "min_stock":  body.min_stock,
        "mrp":        body.mrp,
        "cost_price": body.cost_price,
    }).execute().data[0]
    return row


@router.post("/products/{product_id}/variants/bulk", status_code=201)
async def bulk_create_variants(product_id: str, body: BulkVariantCreate, vendor=Depends(get_current_vendor)):
    """Create variants from a colour × size × design matrix."""
    db = get_db()
    p = db.table("bangle_products").select("id").eq("id", product_id).eq("vendor_id", vendor["id"]).execute()
    if not p.data:
        raise HTTPException(status_code=404, detail="Product not found")

    colours = body.colours or [None]
    sizes   = body.sizes   or [None]
    designs = body.designs or [None]

    rows = []
    for colour in colours:
        for size in sizes:
            for design in designs:
                rows.append({
                    "product_id": product_id,
                    "vendor_id":  vendor["id"],
                    "colour":     colour,
                    "size":       size,
                    "design":     design,
                    "stock":      body.stock_per_variant,
                    "min_stock":  12,
                })

    if not rows:
        raise HTTPException(status_code=400, detail="No variants to create")

    result = db.table("bangle_variants").insert(rows).execute()
    return {"created": len(result.data), "variants": result.data}


@router.patch("/variants/{variant_id}")
async def update_variant(variant_id: str, body: VariantUpdate, vendor=Depends(get_current_vendor)):
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        db.table("bangle_variants")
        .update(updates)
        .eq("id", variant_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Variant not found")
    return result.data[0]


@router.delete("/variants/{variant_id}")
async def delete_variant(variant_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    db.table("bangle_variants").update({"is_active": False}).eq("id", variant_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Variant deleted"}


# ── Stock summary ─────────────────────────────────────────────

@router.get("/stock-summary")
async def stock_summary(vendor=Depends(get_current_vendor)):
    db = get_db()
    variants = (
        db.table("bangle_variants")
        .select("colour,size,stock,min_stock,product_id")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
    ).data or []

    low_stock  = [v for v in variants if v["stock"] < v["min_stock"]]
    out_stock  = [v for v in variants if v["stock"] == 0]
    total_pcs  = sum(v["stock"] for v in variants)

    return {
        "total_variants": len(variants),
        "total_pieces":   total_pcs,
        "low_stock":      len(low_stock),
        "out_of_stock":   len(out_stock),
    }


# ── Sales schemas ─────────────────────────────────────────────

class SaleItem(BaseModel):
    variant_id:   str
    product_id:   str
    product_name: str
    colour:       Optional[str] = None
    size:         Optional[str] = None
    design:       Optional[str] = None
    unit:         str            # piece / dozen / set
    unit_qty:     int
    unit_price:   float
    pieces:       int
    amount:       float
    gst_percent:  int = 3


class SaleCreate(BaseModel):
    items:          list[SaleItem]
    customer_name:  Optional[str] = None
    customer_phone: Optional[str] = None
    payment_mode:   str = "cash"
    apply_gst:      bool = False
    notes:          Optional[str] = None


# ── Sales routes ──────────────────────────────────────────────

@router.post("/sales", status_code=201)
async def create_sale(body: SaleCreate, vendor=Depends(get_current_vendor)):
    if not body.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    db = get_db()
    subtotal   = sum(i.amount for i in body.items)
    gst_amount = sum(i.amount * i.gst_percent / 100 for i in body.items) if body.apply_gst else 0
    total      = subtotal + gst_amount

    sale = db.table("bangle_sales").insert({
        "vendor_id":      vendor["id"],
        "customer_name":  body.customer_name,
        "customer_phone": body.customer_phone,
        "items":          [i.model_dump() for i in body.items],
        "subtotal":       round(subtotal, 2),
        "gst_amount":     round(gst_amount, 2),
        "total":          round(total, 2),
        "payment_mode":   body.payment_mode,
        "notes":          body.notes,
    }).execute().data[0]

    # Deduct stock from each variant
    for item in body.items:
        row = db.table("bangle_variants").select("stock") \
            .eq("id", item.variant_id).eq("vendor_id", vendor["id"]).execute()
        if row.data:
            new_stock = max(0, row.data[0]["stock"] - item.pieces)
            db.table("bangle_variants").update({"stock": new_stock}) \
                .eq("id", item.variant_id).execute()

    return sale


@router.get("/sales/today")
async def today_summary(vendor=Depends(get_current_vendor)):
    db   = get_db()
    today = date_type.today().isoformat()
    sales = (
        db.table("bangle_sales")
        .select("total,items")
        .eq("vendor_id", vendor["id"])
        .eq("sale_date", today)
        .execute()
    ).data or []

    return {
        "total_revenue": round(sum(s["total"] for s in sales), 2),
        "total_bills":   len(sales),
        "total_pieces":  sum(
            sum(i.get("pieces", 0) for i in s.get("items", []))
            for s in sales
        ),
    }


@router.get("/sales")
async def list_sales(
    sale_date: Optional[str] = Query(None),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    q  = db.table("bangle_sales").select("*").eq("vendor_id", vendor["id"])
    if sale_date:
        q = q.eq("sale_date", sale_date)
    return (q.order("created_at", desc=True).limit(100).execute()).data or []


@router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, vendor=Depends(get_current_vendor)):
    db  = get_db()
    row = db.table("bangle_sales").select("*") \
        .eq("id", sale_id).eq("vendor_id", vendor["id"]).execute()
    if not row.data:
        raise HTTPException(status_code=404, detail="Sale not found")
    return row.data[0]


# ── Insights ──────────────────────────────────────────────────
from collections import defaultdict
from datetime import timedelta

@router.get("/insights/velocity")
async def bangle_velocity(
    days: int = Query(30, ge=7, le=90),
    vendor=Depends(get_current_vendor),
):
    """Top-selling colours, sizes and designs by pieces sold."""
    db    = get_db()
    since = (date_type.today() - timedelta(days=days)).isoformat()
    sales = (
        db.table("bangle_sales").select("items,sale_date")
        .eq("vendor_id", vendor["id"]).gte("sale_date", since).execute()
    ).data or []

    colour_map: dict = defaultdict(int)
    size_map:   dict = defaultdict(int)
    design_map: dict = defaultdict(int)
    total_pieces = 0

    for sale in sales:
        for item in (sale.get("items") or []):
            pcs = int(item.get("pieces") or 0)
            total_pieces += pcs
            if item.get("colour"): colour_map[item["colour"]] += pcs
            if item.get("size"):   size_map[item["size"]]     += pcs
            if item.get("design"): design_map[item["design"]] += pcs

    return {
        "period_days":   days,
        "total_pieces":  total_pieces,
        "top_colours":   [{"label": k, "pieces": v} for k, v in sorted(colour_map.items(), key=lambda x: -x[1])[:10]],
        "top_sizes":     [{"label": k, "pieces": v} for k, v in sorted(size_map.items(),   key=lambda x: -x[1])[:8]],
        "top_designs":   [{"label": k, "pieces": v} for k, v in sorted(design_map.items(), key=lambda x: -x[1])[:8]],
    }


@router.get("/insights/dead-stock")
async def bangle_dead_stock(
    days: int = Query(30, ge=7, le=90),
    vendor=Depends(get_current_vendor),
):
    """Variants with stock > 0 but zero sales in the last N days."""
    db    = get_db()
    since = (date_type.today() - timedelta(days=days)).isoformat()

    variants = (
        db.table("bangle_variants").select("id,colour,size,design,stock,min_stock,cost_price,product_id")
        .eq("vendor_id", vendor["id"]).eq("is_active", True).gt("stock", 0).execute()
    ).data or []

    sales = (
        db.table("bangle_sales").select("items")
        .eq("vendor_id", vendor["id"]).gte("sale_date", since).execute()
    ).data or []

    sold_ids: set = set()
    for sale in sales:
        for item in (sale.get("items") or []):
            if item.get("variant_id"):
                sold_ids.add(item["variant_id"])

    # Fetch product names for context
    product_ids = list({v["product_id"] for v in variants})
    products    = {}
    if product_ids:
        rows = db.table("bangle_products").select("id,name").in_("id", product_ids).execute().data or []
        products = {r["id"]: r["name"] for r in rows}

    dead = []
    for v in variants:
        if v["id"] not in sold_ids:
            cost = float(v.get("cost_price") or 0)
            dead.append({
                "variant_id":    v["id"],
                "product_name":  products.get(v["product_id"], ""),
                "colour":        v["colour"],
                "size":          v["size"],
                "design":        v["design"],
                "stock":         v["stock"],
                "blocked_value": round(v["stock"] * cost, 2),
            })

    dead.sort(key=lambda x: -x["blocked_value"])
    return {
        "period_days":    days,
        "dead_count":     len(dead),
        "total_blocked":  round(sum(d["blocked_value"] for d in dead), 2),
        "items":          dead[:30],
    }


@router.get("/insights/profit")
async def bangle_profit(vendor=Depends(get_current_vendor)):
    """Today and month-to-date profit from bangle sales."""
    db    = get_db()
    today = date_type.today()
    month_start = today.replace(day=1).isoformat()

    sales = (
        db.table("bangle_sales").select("total,items,sale_date")
        .eq("vendor_id", vendor["id"]).gte("sale_date", month_start).execute()
    ).data or []

    # Fetch cost_price for all variants referenced in sales
    all_variant_ids = list({
        item["variant_id"]
        for sale in sales for item in (sale.get("items") or [])
        if item.get("variant_id")
    })
    variant_costs: dict = {}
    if all_variant_ids:
        rows = db.table("bangle_variants").select("id,cost_price") \
            .in_("id", all_variant_ids).execute().data or []
        variant_costs = {r["id"]: float(r.get("cost_price") or 0) for r in rows}

    def calc(sale_list):
        rev  = sum(float(s["total"]) for s in sale_list)
        cost = sum(
            float(item.get("pieces") or 0) * variant_costs.get(item.get("variant_id", ""), 0)
            for s in sale_list for item in (s.get("items") or [])
        )
        profit = rev - cost
        margin = (profit / rev * 100) if rev > 0 else 0
        return {"revenue": round(rev, 2), "cost": round(cost, 2),
                "profit": round(profit, 2), "margin_pct": round(margin, 1)}

    today_str  = today.isoformat()
    today_sales = [s for s in sales if s.get("sale_date", "")[:10] == today_str]

    return {"today": calc(today_sales), "month": calc(sales)}


@router.get("/insights/briefing")
async def bangle_briefing(vendor=Depends(get_current_vendor)):
    """All-in-one daily briefing card for bangle store dashboard."""
    db    = get_db()
    today = date_type.today()
    since_30 = (today - timedelta(days=30)).isoformat()

    # Today's sales
    t_sales = (
        db.table("bangle_sales").select("total,items")
        .eq("vendor_id", vendor["id"]).eq("sale_date", today.isoformat()).execute()
    ).data or []
    t_revenue = round(sum(float(s["total"]) for s in t_sales), 2)
    t_bills   = len(t_sales)
    t_pieces  = sum(int(i.get("pieces", 0)) for s in t_sales for i in (s.get("items") or []))

    # Today's top colour
    colour_map: dict = defaultdict(int)
    for sale in t_sales:
        for item in (sale.get("items") or []):
            if item.get("colour"):
                colour_map[item["colour"]] += int(item.get("pieces", 0))
    top_colour = max(colour_map, key=lambda k: colour_map[k]) if colour_map else None

    # Low stock variants
    low_stock = (
        db.table("bangle_variants").select("id,colour,size,stock,min_stock")
        .eq("vendor_id", vendor["id"]).eq("is_active", True).execute()
    ).data or []
    low_stock = [v for v in low_stock if v["stock"] < v["min_stock"]]
    out_stock = [v for v in low_stock if v["stock"] == 0]

    # Dead stock (30 days)
    sold_ids: set = set()
    recent_sales = (
        db.table("bangle_sales").select("items")
        .eq("vendor_id", vendor["id"]).gte("sale_date", since_30).execute()
    ).data or []
    for s in recent_sales:
        for item in (s.get("items") or []):
            if item.get("variant_id"):
                sold_ids.add(item["variant_id"])
    all_variants = (
        db.table("bangle_variants").select("id,stock")
        .eq("vendor_id", vendor["id"]).eq("is_active", True).gt("stock", 0).execute()
    ).data or []
    dead_count = sum(1 for v in all_variants if v["id"] not in sold_ids)

    # Upcoming festival (next 60 days)
    from app.routers.insights import get_upcoming_festivals
    _, upcoming_fests = get_upcoming_festivals(days_ahead=60)
    next_fest = upcoming_fests[0] if upcoming_fests else None

    return {
        "today": {
            "revenue":    t_revenue,
            "bills":      t_bills,
            "pieces":     t_pieces,
            "top_colour": top_colour,
        },
        "low_stock_count": len(low_stock),
        "out_of_stock":    len(out_stock),
        "dead_stock_count": dead_count,
        "next_festival":   next_fest,
    }
