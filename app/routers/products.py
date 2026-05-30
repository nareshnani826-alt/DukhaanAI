import asyncio
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.core.cache import cache_get, cache_set, cache_bust
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductOut, MessageResponse,
    BulkImportRequest, BulkImportResponse,
)

router = APIRouter(prefix="/products", tags=["products"])

_CACHE_TTL = 30  # seconds — products change infrequently within a request burst


def _bust(vendor_id: str) -> None:
    cache_bust(f"products:{vendor_id}:")


@router.get("", response_model=list[ProductOut])
async def list_products(
    category:  str | None = Query(None),
    low_stock: bool       = Query(False, description="Only show items below min stock"),
    search:    str | None = Query(None),
    is_active: bool       = Query(True),
    limit:     int        = Query(200, ge=1, le=1000),
    offset:    int        = Query(0,   ge=0),
    vendor=Depends(get_current_vendor),
):
    # low_stock uses a dedicated RPC — skip the cache for that path
    if low_stock:
        def _low():
            return get_db().rpc(
                "get_low_stock_products", {"p_vendor_id": vendor["id"]}
            ).execute().data
        return await asyncio.to_thread(_low)

    cache_key = f"products:{vendor['id']}:{limit}:{offset}:{category or ''}:{search or ''}"
    cached = cache_get(cache_key, _CACHE_TTL)
    if cached is not None:
        return cached

    def _query():
        db = get_db()
        q = (db.table("products")
               .select("*")
               .eq("vendor_id", vendor["id"])
               .eq("is_active", is_active))
        if category:
            q = q.eq("category", category)
        if search:
            q = q.ilike("name", f"%{search}%")
        return q.order("name").range(offset, offset + limit - 1).execute().data

    data = await asyncio.to_thread(_query)
    cache_set(cache_key, data)
    return data


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, vendor=Depends(get_current_vendor)):
    db = get_db()
    if body.sku:
        existing = (
            db.table("products")
            .select("id")
            .eq("vendor_id", vendor["id"])
            .eq("sku", body.sku)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail=f"SKU '{body.sku}' already exists")

    data = body.model_dump()
    data["vendor_id"] = vendor["id"]
    if not data.get("sku"):
        data["sku"] = None
    result = db.table("products").insert(data).execute()
    _bust(vendor["id"])
    return result.data[0]


@router.post("/bulk", response_model=BulkImportResponse)
async def bulk_import_products(body: BulkImportRequest, vendor=Depends(get_current_vendor)):
    """Upsert products in bulk: adds new ones, adds to stock of existing ones (matched by name)."""
    db = get_db()
    existing_rows = (
        db.table("products")
        .select("id,name,stock,mrp,cost_price")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
        .data
    )
    by_name = {r["name"].lower().strip(): r for r in existing_rows}

    added = updated = failed = 0
    for item in body.items:
        try:
            key = item.name.lower().strip()
            if key in by_name:
                ex = by_name[key]
                db.table("products").update({
                    "stock":      ex["stock"] + item.stock,
                    "mrp":        item.mrp        if item.mrp        > 0 else ex["mrp"],
                    "cost_price": item.cost_price if item.cost_price > 0 else ex["cost_price"],
                }).eq("id", ex["id"]).execute()
                updated += 1
            else:
                data = item.model_dump()
                data["vendor_id"] = vendor["id"]
                data["sku"] = None
                db.table("products").insert(data).execute()
                by_name[key] = {"name": item.name, "stock": item.stock}
                added += 1
        except Exception:
            failed += 1

    _bust(vendor["id"])
    return BulkImportResponse(added=added, updated=updated, failed=failed, total=len(body.items))


@router.get("/low-stock", response_model=list[ProductOut])
async def low_stock_alerts(vendor=Depends(get_current_vendor)):
    """Dedicated low-stock endpoint using a PostgreSQL RPC — no Python-side filter."""
    def _query():
        return get_db().rpc(
            "get_low_stock_products", {"p_vendor_id": vendor["id"]}
        ).execute().data
    return await asyncio.to_thread(_query)


@router.get("/categories")
async def list_categories(vendor=Depends(get_current_vendor)):
    db = get_db()
    result = (
        db.table("products")
        .select("category")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
    )
    cats = sorted({p["category"] for p in result.data if p.get("category")})
    return {"categories": cats}


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    result = (
        db.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return result.data[0]


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str, body: ProductUpdate, vendor=Depends(get_current_vendor)
):
    db = get_db()
    existing = (
        db.table("products")
        .select("id")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    result = db.table("products").update(updates).eq("id", product_id).execute()
    _bust(vendor["id"])
    return result.data[0]


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(product_id: str, vendor=Depends(get_current_vendor)):
    db = get_db()
    existing = (
        db.table("products")
        .select("id")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    db.table("products").update({"is_active": False}).eq("id", product_id).execute()
    _bust(vendor["id"])
    return MessageResponse(message="Product removed")


@router.post("/{product_id}/adjust-stock", response_model=ProductOut)
async def adjust_stock(
    product_id: str,
    adjustment: float = Query(..., description="Positive = add stock, negative = remove"),
    reason: str = Query("manual adjustment"),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    result = (
        db.table("products")
        .select("*")
        .eq("id", product_id)
        .eq("vendor_id", vendor["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Product not found")

    product = result.data[0]
    new_stock = product["stock"] + adjustment
    if new_stock < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce stock below 0 (current: {product['stock']})",
        )

    updated = (
        db.table("products")
        .update({"stock": new_stock})
        .eq("id", product_id)
        .execute()
    )
    _bust(vendor["id"])
    return updated.data[0]
