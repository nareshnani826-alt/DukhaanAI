from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_vendor

router = APIRouter(prefix="/community-catalog", tags=["community"])


class ContributeProduct(BaseModel):
    name:     str
    category: Optional[str] = "Other"
    unit:     Optional[str] = "pc"
    mrp:      Optional[float] = 0
    cost:     Optional[float] = 0
    gst:      Optional[float] = 0


@router.get("/search")
async def search(q: str = Query(..., min_length=2)):
    db = get_db()
    results = db.table("community_products")\
        .select("*")\
        .ilike("name", f"%{q}%")\
        .eq("verified", True)\
        .order("usage_count", desc=True)\
        .limit(10).execute()
    return results.data


@router.get("/trending")
async def trending():
    db = get_db()
    results = db.table("community_products")\
        .select("*")\
        .order("usage_count", desc=True)\
        .limit(20).execute()
    return results.data


@router.post("/contribute")
async def contribute(body: ContributeProduct, vendor=Depends(get_current_vendor)):
    db = get_db()
    try:
        # Check if already exists
        existing = db.table("community_products")\
            .select("id, usage_count")\
            .ilike("name", body.name.strip())\
            .execute()

        if existing.data:
            # Increment usage count
            prod = existing.data[0]
            db.table("community_products")\
                .update({ "usage_count": (prod["usage_count"] or 1) + 1 })\
                .eq("id", prod["id"]).execute()
        else:
            # Add new community product
            db.table("community_products").insert({
                "name":      body.name.strip(),
                "category":  body.category,
                "unit":      body.unit,
                "mrp":       body.mrp,
                "cost":      body.cost,
                "gst":       body.gst,
                "added_by":  vendor["id"],
                "usage_count": 1,
                "verified":  False,  # needs admin verification
            }).execute()
    except Exception:
        pass  # silent fail — community contribution is optional
    return {"ok": True}
