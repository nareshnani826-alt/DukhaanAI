from datetime import date as date_type
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, field_validator

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/bangle", tags=["bangle"])


# ── Schemas ───────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    city:  Optional[str] = None
    notes: Optional[str] = None

class SupplierUpdate(BaseModel):
    name:  Optional[str] = None
    phone: Optional[str] = None
    city:  Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ProductCreate(BaseModel):
    name: str
    category: str = "Bangles"
    brand: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    mrp: float = 0
    cost_price: float = 0
    gst_percent: int = 3
    supplier_id:   Optional[str] = None
    tray_location: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v: raise ValueError("Name cannot be empty")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    mrp: Optional[float] = None
    cost_price: Optional[float] = None
    gst_percent: Optional[int] = None
    is_active: Optional[bool] = None
    supplier_id:    Optional[str] = None
    tray_location:  Optional[str] = None
    stock_fullness: Optional[int] = None


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


class ScanImageRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


# ── Suppliers ─────────────────────────────────────────────────

@router.get("/suppliers")
async def list_suppliers(vendor=Depends(get_current_vendor)):
    db = get_db()
    return (
        db.table("bangle_suppliers")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .order("name")
        .execute()
    ).data or []


@router.post("/suppliers", status_code=201)
async def create_supplier(body: SupplierCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    return db.table("bangle_suppliers").insert({
        "vendor_id": vendor["id"],
        "name":  body.name,
        "phone": body.phone,
        "city":  body.city,
        "notes": body.notes,
    }).execute().data[0]


@router.patch("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, body: SupplierUpdate, vendor=Depends(get_current_vendor)):
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    result = db.table("bangle_suppliers").update(updates) \
        .eq("id", supplier_id).eq("vendor_id", vendor["id"]).execute()
    if not result.data:
        raise HTTPException(404, "Supplier not found")
    return result.data[0]


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    db.table("bangle_suppliers").update({"is_active": False}) \
        .eq("id", supplier_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Supplier deleted"}


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
    insert_data = {
        "vendor_id":   vendor["id"],
        "name":        body.name,
        "category":    body.category,
        "description": body.description,
        "mrp":         body.mrp,
        "cost_price":  body.cost_price,
        "gst_percent": body.gst_percent,
    }
    # These columns are added by add_bangle_suppliers.sql migration.
    # Only include them if the caller provided a value, so the endpoint
    # still works on databases where the migration hasn't been applied yet.
    if body.supplier_id:
        insert_data["supplier_id"] = body.supplier_id
    if body.tray_location:
        insert_data["tray_location"] = body.tray_location

    row = db.table("bangle_products").insert(insert_data).execute().data[0]

    # Auto-fetch image from the web — failure is silent, product still created
    query = f"{body.name} {body.category} Indian jewelry"
    image_url = await _auto_fetch_image(row["id"], vendor["id"], query)
    if image_url:
        row["image_url"] = image_url

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

    # Cascade MRP / cost_price changes to all variants so billing picks up correct prices
    variant_price_updates = {k: updates[k] for k in ("mrp", "cost_price") if k in updates}
    if variant_price_updates:
        db.table("bangle_variants") \
            .update(variant_price_updates) \
            .eq("product_id", product_id) \
            .eq("vendor_id", vendor["id"]) \
            .eq("is_active", True) \
            .execute()

    return result.data[0]


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    db.table("bangle_products").update({"is_active": False}).eq("id", product_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Product deleted"}


# ── Auto image fetch (Bing → Wikimedia Commons fallback) ──────

async def _download_first_usable(client: httpx.AsyncClient, urls: list[str]) -> tuple[bytes | None, str]:
    """Try each URL; return (content, mime) for first image ≤ 8 MB."""
    for url in urls:
        try:
            r = await client.get(url, follow_redirects=True, timeout=10)
            r.raise_for_status()
            ct = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
            if not ct.startswith("image/"):
                continue
            if len(r.content) > 8 * 1024 * 1024:
                continue
            return r.content, ct
        except Exception:
            continue
    return None, "image/jpeg"


async def _search_bing(query: str) -> tuple[bytes | None, str]:
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(
                "https://api.bing.microsoft.com/v7.0/images/search",
                params={"q": query, "count": 5, "safeSearch": "Strict", "imageType": "Photo"},
                headers={"Ocp-Apim-Subscription-Key": settings.bing_search_key},
            )
            r.raise_for_status()
            urls = [h["contentUrl"] for h in r.json().get("value", [])]
            return await _download_first_usable(client, urls)
    except Exception:
        return None, "image/jpeg"


async def _search_wikimedia(query: str) -> tuple[bytes | None, str]:
    """Free fallback: search Wikimedia Commons (no API key required)."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Find matching file pages in Wikimedia Commons
            sr = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query", "list": "search",
                    "srsearch": query, "srnamespace": "6",
                    "format": "json", "srlimit": "10",
                },
            )
            sr.raise_for_status()
            titles = [r["title"] for r in sr.json().get("query", {}).get("search", [])]
            if not titles:
                return None, "image/jpeg"

            # Batch-fetch image info for those titles
            ir = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query", "titles": "|".join(titles[:5]),
                    "prop": "imageinfo", "iiprop": "url|mime|size",
                    "format": "json",
                },
            )
            ir.raise_for_status()
            pages = ir.json().get("query", {}).get("pages", {}).values()
            urls = []
            for page in pages:
                for info in page.get("imageinfo", []):
                    mime = info.get("mime", "")
                    size = info.get("size", 0)
                    if mime.startswith("image/") and size < 8 * 1024 * 1024:
                        urls.append(info["url"])

            return await _download_first_usable(client, urls)
    except Exception:
        return None, "image/jpeg"


async def _auto_fetch_image(product_id: str, vendor_id: str, query: str) -> str | None:
    """Fetch product image (Bing if key set, else Wikimedia Commons), upload to Supabase storage."""
    if settings.bing_search_key:
        content, ctype = await _search_bing(query)
    else:
        # Free fallback — use just the first two words (product name) for better Wikimedia hits
        simple_query = " ".join(query.split()[:2])  # e.g. "Plain bangles"
        content, ctype = await _search_wikimedia(simple_query)

    if not content:
        return None

    try:
        db = get_db()
        path = f"{vendor_id}/{product_id}"
        try:
            db.storage.from_("bangle-images").remove([path])
        except Exception:
            pass
        db.storage.from_("bangle-images").upload(path, content, {"content-type": ctype})
        public_url = db.storage.from_("bangle-images").get_public_url(path)
        db.table("bangle_products").update({"image_url": public_url}) \
            .eq("id", product_id).eq("vendor_id", vendor_id).execute()
        return public_url
    except Exception:
        return None


@router.post("/products/{product_id}/auto-image")
async def auto_image_product(product_id: str, vendor=Depends(get_current_vendor)):
    """Re-fetch product image (Bing if key configured, else Wikimedia Commons)."""
    db = get_db()
    existing = (
        db.table("bangle_products")
        .select("id, name, category")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    ).data
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    p = existing[0]
    query = f"{p['name']} {p['category']} Indian jewelry"
    url = await _auto_fetch_image(product_id, vendor["id"], query)
    if not url:
        raise HTTPException(
            status_code=503,
            detail="Could not find a suitable image — try again or upload manually",
        )
    return {"image_url": url}


# ── Product image upload ───────────────────────────────────────

@router.post("/products/{product_id}/image")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    existing = (
        db.table("bangle_products")
        .select("id, image_url")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    ).data
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large — max 5 MB")

    content_type = file.content_type or "image/jpeg"
    # Fixed storage path per product — overwrite previous image
    path = f"{vendor['id']}/{product_id}"

    # Remove old file first so upload never conflicts
    try:
        db.storage.from_("bangle-images").remove([path])
    except Exception:
        pass

    db.storage.from_("bangle-images").upload(
        path, content, {"content-type": content_type}
    )
    public_url = db.storage.from_("bangle-images").get_public_url(path)

    db.table("bangle_products").update({"image_url": public_url}).eq("id", product_id).eq("vendor_id", vendor["id"]).execute()
    return {"image_url": public_url}


@router.delete("/products/{product_id}/image")
async def delete_product_image(product_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    existing = (
        db.table("bangle_products")
        .select("id")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    ).data
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    path = f"{vendor['id']}/{product_id}"
    try:
        db.storage.from_("bangle-images").remove([path])
    except Exception:
        pass

    db.table("bangle_products").update({"image_url": None}).eq("id", product_id).eq("vendor_id", vendor["id"]).execute()
    return {"message": "Image removed"}


# ── Variants ──────────────────────────────────────────────────
# NOTE: /bulk must be registered BEFORE /{product_id}/variants so Starlette
# doesn't shadow it with the shorter path pattern.

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


@router.post("/products/{product_id}/variants", status_code=201)
async def add_variant(product_id: str, body: VariantCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
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


# ── Bulk product import ───────────────────────────────────────

class BulkImportRow(BaseModel):
    name: str
    category: str = "Bangles"
    mrp: float = 0
    cost_price: float = 0
    gst_percent: int = 3
    colour: Optional[str] = None
    size: Optional[str] = None
    design: Optional[str] = None
    stock: int = 0

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v: raise ValueError("Name cannot be empty")
        return v[:150]


class BulkImportBody(BaseModel):
    rows: list[BulkImportRow]


@router.post("/products/bulk")
async def bulk_import_products(body: BulkImportBody, vendor=Depends(get_current_vendor)):
    """Bulk-import bangle products with variants. Rows with the same name share one product."""
    db = get_db()
    existing = (
        db.table("bangle_products")
        .select("id,name")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
    ).data or []
    by_name: dict = {p["name"].lower().strip(): p["id"] for p in existing}

    products_added = variants_added = failed = 0

    for row in body.rows:
        try:
            key = row.name.lower().strip()
            if key in by_name:
                product_id = by_name[key]
            else:
                p = db.table("bangle_products").insert({
                    "vendor_id":   vendor["id"],
                    "name":        row.name,
                    "category":    row.category,
                    "mrp":         row.mrp,
                    "cost_price":  row.cost_price,
                    "gst_percent": row.gst_percent,
                }).execute().data[0]
                product_id = p["id"]
                by_name[key] = product_id
                products_added += 1

            if row.colour or row.size or row.design or row.stock > 0:
                db.table("bangle_variants").insert({
                    "product_id": product_id,
                    "vendor_id":  vendor["id"],
                    "colour":     row.colour,
                    "size":       row.size,
                    "design":     row.design,
                    "stock":      row.stock,
                    "min_stock":  12,
                }).execute()
                variants_added += 1
        except Exception:
            failed += 1

    return {
        "products_added": products_added,
        "variants_added": variants_added,
        "failed":         failed,
        "total":          len(body.rows),
    }


class RestockItem(BaseModel):
    variant_id: str
    qty: int


class BulkRestockBody(BaseModel):
    items: list[RestockItem]
    mode: str = "add"  # "add" | "set"


@router.post("/variants/bulk-restock")
async def bulk_restock_variants(body: BulkRestockBody, vendor=Depends(get_current_vendor)):
    """Set or add stock for multiple variants in one call."""
    db = get_db()
    updated = failed = 0

    if body.mode == "add":
        # Fetch all current stocks in one query
        ids = [i.variant_id for i in body.items]
        rows = (
            db.table("bangle_variants")
            .select("id,stock")
            .in_("id", ids)
            .eq("vendor_id", vendor["id"])
            .execute()
        ).data or []
        current = {r["id"]: r["stock"] for r in rows}

        for item in body.items:
            try:
                new_stock = max(0, current.get(item.variant_id, 0) + item.qty)
                db.table("bangle_variants").update({"stock": new_stock}) \
                    .eq("id", item.variant_id).eq("vendor_id", vendor["id"]).execute()
                updated += 1
            except Exception:
                failed += 1
    else:
        for item in body.items:
            try:
                db.table("bangle_variants").update({"stock": max(0, item.qty)}) \
                    .eq("id", item.variant_id).eq("vendor_id", vendor["id"]).execute()
                updated += 1
            except Exception:
                failed += 1

    return {"updated": updated, "failed": failed, "total": len(body.items)}


# ── Stock summary ─────────────────────────────────────────────

@router.get("/stock-summary")
async def stock_summary(vendor=Depends(get_current_vendor)):
    db = get_db()
    variants = (
        db.table("bangle_variants")
        .select("colour,size,stock,min_stock,product_id,cost_price")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
    ).data or []

    # Fetch product-level cost_price fallbacks
    product_ids = list({v["product_id"] for v in variants if v.get("product_id")})
    prod_cost = {}
    if product_ids:
        prods = (
            db.table("bangle_products")
            .select("id,cost_price")
            .in_("id", product_ids)
            .execute()
        ).data or []
        prod_cost = {p["id"]: p.get("cost_price") or 0 for p in prods}

    low_stock  = [v for v in variants if v["stock"] < v["min_stock"]]
    out_stock  = [v for v in variants if v["stock"] == 0]
    total_pcs  = sum(v["stock"] for v in variants)

    # Investment = stock × cost_price_per_dozen / 12  (per piece cost)
    total_investment = sum(
        v["stock"] * (v.get("cost_price") or prod_cost.get(v["product_id"], 0) or 0) / 12
        for v in variants
    )

    return {
        "total_variants":    len(variants),
        "total_pieces":      total_pcs,
        "low_stock":         len(low_stock),
        "out_of_stock":      len(out_stock),
        "total_investment":  round(total_investment, 2),
    }


# ── Sales schemas ─────────────────────────────────────────────

class SaleItem(BaseModel):
    # Catalog items fill all fields; Quick Items leave variant_id/product_id null
    variant_id:          Optional[str] = None
    product_id:          Optional[str] = None
    product_name:        str
    custom_description:  Optional[str] = None   # for Quick Items
    category:            Optional[str] = None   # tag for analytics
    colour:              Optional[str] = None
    size:                Optional[str] = None
    design:              Optional[str] = None
    unit:                str = "piece"
    unit_qty:            int = 1
    unit_price:          float
    pieces:              int = 1
    amount:              float
    gst_percent:         int = 3
    is_quick_item:       bool = False


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

    # Deduct stock — skip Quick Items (no variant to deduct from)
    for item in body.items:
        if item.is_quick_item or not item.variant_id:
            continue
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
            # cost_price is per-dozen; stock is in pieces → cost per piece = cost/12
            cost = float(v.get("cost_price") or 0) / 12
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
        # cost_price is stored per-dozen; divide by 12 to get per-piece cost
        cost = sum(
            float(item.get("pieces") or 0) * variant_costs.get(item.get("variant_id", ""), 0) / 12
            for s in sale_list for item in (s.get("items") or [])
        )
        profit = rev - cost
        margin = (profit / rev * 100) if rev > 0 else 0
        return {"revenue": round(rev, 2), "cost": round(cost, 2),
                "profit": round(profit, 2), "margin_pct": round(margin, 1)}

    today_str  = today.isoformat()
    today_sales = [s for s in sales if s.get("sale_date", "")[:10] == today_str]

    return {"today": calc(today_sales), "month": calc(sales)}


@router.get("/insights/category-breakdown")
async def category_breakdown(
    period: str = Query("month", pattern="^(today|week|month)$"),
    vendor=Depends(get_current_vendor),
):
    """Revenue, cost, margin breakdown by category for the chosen period."""
    from datetime import timedelta
    db    = get_db()
    today = date_type.today()
    if period == "today":
        since = today.isoformat()
    elif period == "week":
        since = (today - timedelta(days=7)).isoformat()
    else:
        since = today.replace(day=1).isoformat()

    sales = (
        db.table("bangle_sales")
        .select("items, total")
        .eq("vendor_id", vendor["id"])
        .gte("sale_date", since)
        .execute()
    ).data or []

    buckets: dict = {}
    for sale in sales:
        for item in (sale.get("items") or []):
            cat = item.get("category") or item.get("design") or "Other"
            if not cat:
                cat = "Other"
            if cat not in buckets:
                buckets[cat] = {"category": cat, "revenue": 0.0, "cost": 0.0, "qty": 0}
            buckets[cat]["revenue"] += float(item.get("amount", 0))
            # cost_price is per-dozen; pieces / 12 × cost
            cp = float(item.get("cost_price") or 0)
            pieces = int(item.get("pieces") or item.get("unit_qty") or 1)
            buckets[cat]["cost"] += (pieces / 12) * cp
            buckets[cat]["qty"]  += pieces

    result = []
    for b in buckets.values():
        profit = b["revenue"] - b["cost"]
        margin = (profit / b["revenue"] * 100) if b["revenue"] > 0 else 0
        result.append({**b,
            "profit":     round(profit, 2),
            "margin_pct": round(margin, 1),
            "revenue":    round(b["revenue"], 2),
            "cost":       round(b["cost"], 2),
        })

    result.sort(key=lambda x: x["revenue"], reverse=True)
    return result


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


# ── Hyperlocal Trend Detector ─────────────────────────────────

def _top_n(counter: dict, n: int) -> list:
    return [
        {"label": k, "pieces": v}
        for k, v in sorted(counter.items(), key=lambda x: -x[1])[:n]
    ]


@router.get("/trends/community")
async def community_trends(
    days: int = Query(7, ge=1, le=30),
    vendor=Depends(get_current_vendor),
):
    """
    Aggregate colour/size/design sales across ALL bangle vendors.
    Privacy: only totals returned — no vendor IDs, names, or prices exposed.
    Authenticated vendors can see area-wide demand to spot stocking gaps.
    """
    db    = get_db()
    since = (date_type.today() - timedelta(days=days)).isoformat()

    # Pull all bangle sales in the period (every vendor)
    all_sales = (
        db.table("bangle_sales")
        .select("vendor_id,items")
        .gte("sale_date", since)
        .execute()
    ).data or []

    colour_map:  dict = defaultdict(int)
    size_map:    dict = defaultdict(int)
    design_map:  dict = defaultdict(int)
    vendor_ids:  set  = set()
    total_pieces = 0

    for sale in all_sales:
        vendor_ids.add(sale.get("vendor_id"))
        for item in (sale.get("items") or []):
            pcs = int(item.get("pieces") or 0)
            total_pieces += pcs
            if item.get("colour"): colour_map[item["colour"]] += pcs
            if item.get("size"):   size_map[item["size"]]     += pcs
            if item.get("design"): design_map[item["design"]] += pcs

    store_count = len(vendor_ids)

    return {
        "period_days":  days,
        "store_count":  store_count,
        "total_pieces": total_pieces,
        "top_colours":  _top_n(colour_map, 10),
        "top_sizes":    _top_n(size_map, 8),
        "top_designs":  _top_n(design_map, 8),
    }


# ── Gemini Vision: scan product image → fields ───────────────

_VISION_PROMPT = """You are reading a price tag, product label, or product photo from an Indian jewellery and accessories shop.
Extract all visible product details and return ONLY valid JSON — no explanation, no markdown fences.

What to look for:
- Product name: written on tag, or describe the product you see (e.g. "Kundan Bangle", "Pearl Earrings")
- Category: must be exactly one of — Bangles | Earrings | Necklace | Maang Tikka | Anklet | Hair Clip | Bindi | Rings | Bracelet | Nose Ring | Other
- MRP or price: look for ₹ symbol, "MRP", "Rate", "Price", "Rs.", "Daam", "Bhav"
- Colours: visible in product photo or mentioned on tag
- Sizes: bangle sizes like 2.2/2.4/2.6/2.8/2.10/2.12/2.14, ring sizes 5-12, or Small/Medium/Large/Free Size
- Design: visible craftsmanship or mentioned on tag

VALID colours: Red, Pink, Maroon, Green, Blue, Navy, Gold, Rose Gold, Silver, White, Black, Orange, Yellow, Purple, Peach, Multi
VALID gst_percent values: 0, 3, 5, 12, 18

Return JSON only (null for anything not visible, empty array if none):
{
  "name": null,
  "category": null,
  "mrp": null,
  "cost_price": null,
  "gst_percent": null,
  "colours": [],
  "sizes": [],
  "designs": []
}"""

# Try models in order; skip 404 (model name wrong) and 429 (rate limit)
_VISION_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash",
]


@router.post("/scan-image")
async def scan_product_image(
    body: ScanImageRequest,
    vendor=Depends(get_current_vendor),
):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Image scan not configured on this server")

    last_err = None
    quota_hit = False
    for model in _VISION_MODELS:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={settings.gemini_api_key}"
        )
        payload = {
            "contents": [{
                "parts": [
                    {"text": _VISION_PROMPT},
                    {"inline_data": {"mime_type": body.mime_type, "data": body.image_base64}},
                ]
            }],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512},
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload)
            if res.status_code == 429:
                quota_hit = True
                last_err = "Gemini quota exceeded — please create a free API key at aistudio.google.com and set GEMINI_API_KEY in Railway"
                continue
            if res.status_code == 404:
                # Model name not valid for this key — try next
                continue
            if not res.is_success:
                data = res.json()
                last_err = data.get("error", {}).get("message", "Gemini error")
                continue
            data = res.json()
            raw  = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            import re, json as _json
            m = re.search(r"\{[\s\S]*\}", raw)
            if not m:
                raise HTTPException(status_code=502, detail="Gemini returned no JSON")
            p = _json.loads(m.group())
            def _str(v):  return v if isinstance(v, str) and v else None
            def _num(v):  return v if isinstance(v, (int, float)) and v > 0 else None
            def _arr(v):  return [x for x in v if x] if isinstance(v, list) else []
            return {
                "name":        _str(p.get("name")),
                "category":    _str(p.get("category")),
                "mrp":         _num(p.get("mrp")),
                "cost_price":  _num(p.get("cost_price")),
                "gst_percent": p.get("gst_percent") if isinstance(p.get("gst_percent"), (int, float)) else None,
                "colours":     _arr(p.get("colours", [])),
                "sizes":       _arr(p.get("sizes", [])),
                "designs":     _arr(p.get("designs", [])),
                "confidence":  0.85,
                "source":      "gemini-vision",
            }
        except HTTPException:
            raise
        except Exception as e:
            last_err = str(e)
            continue

    raise HTTPException(status_code=503, detail=last_err or "Image scan failed")
