from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
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
