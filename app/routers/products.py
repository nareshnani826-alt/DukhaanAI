from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_vendor
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductOut, MessageResponse

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    category: str | None = Query(None),
    low_stock: bool = Query(False, description="Only show items below min stock"),
    search: str | None = Query(None),
    is_active: bool = Query(True),
    vendor=Depends(get_current_vendor),
):
    db = get_db()
    q = db.table("products").select("*").eq("vendor_id", vendor["id"]).eq("is_active", is_active)

    if category:
        q = q.eq("category", category)
    if low_stock:
        # Supabase doesn't support column comparison in filter, use RPC or fetch + filter
        result = q.execute()
        return [p for p in result.data if p["stock"] < p["min_stock"]]
    if search:
        q = q.ilike("name", f"%{search}%")

    return q.order("name").execute().data


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, vendor=Depends(get_current_vendor)):
    db = get_db()

    # Check SKU uniqueness per vendor
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
    # Empty string SKU → None to avoid unique constraint conflicts
    if not data.get("sku"):
        data["sku"] = None
    result = db.table("products").insert(data).execute()
    return result.data[0]


@router.get("/low-stock", response_model=list[ProductOut])
async def low_stock_alerts(vendor=Depends(get_current_vendor)):
    db = get_db()
    result = (
        db.table("products")
        .select("*")
        .eq("vendor_id", vendor["id"])
        .eq("is_active", True)
        .execute()
    )
    alerts = [p for p in result.data if p["stock"] < p["min_stock"]]
    alerts.sort(key=lambda p: p["stock"])
    return alerts


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
    # Verify ownership
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

    # Soft delete — preserves sales history
    db.table("products").update({"is_active": False}).eq("id", product_id).execute()
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
    return updated.data[0]
