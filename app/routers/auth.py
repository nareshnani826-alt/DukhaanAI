from datetime import datetime, timedelta, timezone
import hashlib

from fastapi import APIRouter, HTTPException, Depends, status

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_vendor,
)
from app.schemas.schemas import (
    VendorRegister, VendorLogin, TokenResponse,
    RefreshRequest, VendorProfile, VendorUpdate, MessageResponse,
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: VendorRegister):
    db = get_db()

    # Check duplicate email
    existing = db.table("vendors").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create vendor
    vendor = db.table("vendors").insert({
        "email": body.email,
        "password_hash": hash_password(body.password),
        "store_name": body.store_name,
        "gstin": body.gstin,
        "phone": body.phone,
        "plan": "free",
    }).execute().data[0]

    # Issue tokens
    access_token = create_access_token({"sub": vendor["id"], "plan": vendor["plan"]})
    raw_refresh, hashed_refresh = create_refresh_token()

    db.table("refresh_tokens").insert({
        "vendor_id": vendor["id"],
        "token_hash": hashed_refresh,
        "expires_at": (
            datetime.now(timezone.utc)
            + timedelta(days=settings.jwt_refresh_token_expire_days)
        ).isoformat(),
    }).execute()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        vendor_id=vendor["id"],
        store_name=vendor["store_name"],
        plan=vendor["plan"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: VendorLogin):
    db = get_db()

    result = db.table("vendors").select("*").eq("email", body.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    vendor = result.data[0]
    if not verify_password(body.password, vendor["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not vendor["is_active"]:
        raise HTTPException(status_code=403, detail="Account suspended")

    access_token = create_access_token({"sub": vendor["id"], "plan": vendor["plan"]})
    raw_refresh, hashed_refresh = create_refresh_token()

    db.table("refresh_tokens").insert({
        "vendor_id": vendor["id"],
        "token_hash": hashed_refresh,
        "expires_at": (
            datetime.now(timezone.utc)
            + timedelta(days=settings.jwt_refresh_token_expire_days)
        ).isoformat(),
    }).execute()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        vendor_id=vendor["id"],
        store_name=vendor["store_name"],
        plan=vendor["plan"],
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest):
    db = get_db()
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()

    row = (
        db.table("refresh_tokens")
        .select("*, vendors(*)")
        .eq("token_hash", token_hash)
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    record = row.data[0]
    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        db.table("refresh_tokens").delete().eq("token_hash", token_hash).execute()
        raise HTTPException(status_code=401, detail="Refresh token expired, please login again")

    vendor = record["vendors"]

    # Rotate refresh token
    db.table("refresh_tokens").delete().eq("token_hash", token_hash).execute()
    raw_refresh, hashed_refresh = create_refresh_token()
    db.table("refresh_tokens").insert({
        "vendor_id": vendor["id"],
        "token_hash": hashed_refresh,
        "expires_at": (
            datetime.now(timezone.utc)
            + timedelta(days=settings.jwt_refresh_token_expire_days)
        ).isoformat(),
    }).execute()

    access_token = create_access_token({"sub": vendor["id"], "plan": vendor["plan"]})
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        vendor_id=vendor["id"],
        store_name=vendor["store_name"],
        plan=vendor["plan"],
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(body: RefreshRequest):
    db = get_db()
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    db.table("refresh_tokens").delete().eq("token_hash", token_hash).execute()
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=VendorProfile)
async def me(vendor=Depends(get_current_vendor)):
    return vendor


@router.patch("/me", response_model=VendorProfile)
async def update_profile(body: VendorUpdate, vendor=Depends(get_current_vendor)):
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        db.table("vendors")
        .update(updates)
        .eq("id", vendor["id"])
        .execute()
    )
    return result.data[0]
