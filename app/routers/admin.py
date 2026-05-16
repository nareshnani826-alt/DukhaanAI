from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.database import get_db
from app.core.security import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/vendors")
async def list_vendors(
    plan: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    admin=Depends(get_current_admin),
):
    db = get_db()
    q = db.table("vendors").select(
        "id, email, store_name, gstin, phone, plan, plan_expires_at, is_active, created_at"
    ).order("created_at", desc=True).limit(limit).offset(offset)

    if plan:
        q = q.eq("plan", plan)
    if search:
        q = q.ilike("store_name", f"%{search}%")

    result = q.execute()
    return {"vendors": result.data, "count": len(result.data)}


@router.get("/revenue")
async def revenue_dashboard(
    days: int = Query(30, ge=1, le=365),
    admin=Depends(get_current_admin),
):
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Active subscriptions by plan
    subs = db.table("subscriptions").select("plan, billing_cycle, amount, status").execute().data
    active_subs = [s for s in subs if s["status"] == "active"]

    by_plan: dict = {}
    mrr = 0.0
    for s in active_subs:
        plan = s["plan"]
        monthly_amount = s["amount"] if s["billing_cycle"] == "monthly" else round(s["amount"] / 12, 2)
        by_plan[plan] = by_plan.get(plan, 0) + 1
        mrr += monthly_amount

    # Vendor counts
    vendors = db.table("vendors").select("plan, is_active, created_at").execute().data
    new_vendors = [v for v in vendors if v["created_at"] >= since]

    plan_counts = {"free": 0, "pro": 0, "wholesale": 0}
    for v in vendors:
        plan_counts[v["plan"]] = plan_counts.get(v["plan"], 0) + 1

    return {
        "period_days": days,
        "mrr": round(mrr, 2),
        "arr": round(mrr * 12, 2),
        "active_subscriptions": len(active_subs),
        "subscriptions_by_plan": by_plan,
        "total_vendors": len(vendors),
        "new_vendors_period": len(new_vendors),
        "vendors_by_plan": plan_counts,
    }


@router.patch("/vendors/{vendor_id}/plan")
async def override_vendor_plan(
    vendor_id: str,
    plan: str = Query(..., pattern="^(free|pro|wholesale)$"),
    admin=Depends(get_current_admin),
):
    """Manually upgrade/downgrade a vendor — for support or trials."""
    db = get_db()
    expires = None
    if plan != "free":
        expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    result = db.table("vendors").update({
        "plan": plan,
        "plan_expires_at": expires,
    }).eq("id", vendor_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": f"Vendor plan updated to {plan}", "vendor": result.data[0]}


@router.patch("/vendors/{vendor_id}/suspend")
async def suspend_vendor(vendor_id: str, admin=Depends(get_current_admin)):
    db = get_db()
    result = db.table("vendors").update({
        "is_active": False, "plan": "free"
    }).eq("id", vendor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor suspended"}


@router.patch("/vendors/{vendor_id}/reactivate")
async def reactivate_vendor(vendor_id: str, admin=Depends(get_current_admin)):
    db = get_db()
    result = db.table("vendors").update({
        "is_active": True
    }).eq("id", vendor_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"message": "Vendor reactivated"}
