from fastapi import APIRouter, HTTPException, Depends

from app.core.database import get_db
from app.core.security import hash_password, require_plan
from app.schemas.schemas import StaffCreate, StaffUpdate, MessageResponse

# Owner only — staff tokens are turned away by app.core.roles.enforce_role
router = APIRouter(prefix="/staff", tags=["staff"])

_FIELDS = "id,username,role,is_active,created_at"


@router.get("")
async def list_staff(vendor=Depends(require_plan("wholesale"))):
    db = get_db()
    return db.table("staff").select(_FIELDS).eq("vendor_id", vendor["id"]).order("created_at").execute().data


@router.post("", status_code=201)
async def add_staff(body: StaffCreate, vendor=Depends(require_plan("wholesale"))):
    db = get_db()
    taken = db.table("staff").select("id").eq("vendor_id", vendor["id"]).eq("username", body.username).execute().data
    if taken:
        raise HTTPException(status_code=409, detail=f'"{body.username}" is already a staff username in your shop.')
    row = db.table("staff").insert({
        "vendor_id": vendor["id"],
        "username":  body.username,
        "pin_hash":  hash_password(body.pin),
        "role":      body.role,
    }).execute().data[0]
    return {k: row[k] for k in _FIELDS.split(",")}


@router.patch("/{staff_id}")
async def update_staff(staff_id: str, body: StaffUpdate, vendor=Depends(require_plan("wholesale"))):
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    if "pin" in updates:
        updates["pin_hash"] = hash_password(updates.pop("pin"))
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    rows = db.table("staff").update(updates).eq("id", staff_id).eq("vendor_id", vendor["id"]).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Staff member not found")
    # Disabled or PIN changed → sign them out on every device
    if "pin_hash" in updates or updates.get("is_active") is False:
        db.table("refresh_tokens").delete().eq("staff_id", staff_id).execute()
    return {k: rows[0][k] for k in _FIELDS.split(",")}


@router.delete("/{staff_id}", response_model=MessageResponse)
async def remove_staff(staff_id: str, vendor=Depends(require_plan("wholesale"))):
    db = get_db()
    rows = db.table("staff").delete().eq("id", staff_id).eq("vendor_id", vendor["id"]).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return MessageResponse(message="Staff member removed")
