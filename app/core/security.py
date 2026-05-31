from datetime import datetime, timedelta, timezone
from typing import Any
import hashlib
import secrets
from functools import lru_cache
import time

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.database import get_db

# ── Vendor cache ──────────────────────────────────────────────
# Avoids a DB round-trip on every authenticated endpoint.
# TTL = 5 minutes; entries evicted on logout via bust_vendor_cache().
_vendor_cache: dict[str, tuple[dict, float]] = {}
_VENDOR_TTL = 300  # seconds

def _cache_get(vendor_id: str) -> dict | None:
    entry = _vendor_cache.get(vendor_id)
    if entry and time.monotonic() - entry[1] < _VENDOR_TTL:
        return entry[0]
    _vendor_cache.pop(vendor_id, None)
    return None

def _cache_set(vendor_id: str, vendor: dict) -> None:
    _vendor_cache[vendor_id] = (vendor, time.monotonic())

def bust_vendor_cache(vendor_id: str) -> None:
    _vendor_cache.pop(vendor_id, None)

bearer_scheme = HTTPBearer()


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict[str, Any]) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload.update({"exp": expire, "type": "access"})
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "access":
            raise JWTError("wrong token type")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_vendor(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    import asyncio
    payload = decode_access_token(credentials.credentials)
    vendor_id: str | None = payload.get("sub")
    if not vendor_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Cache hit — skip the DB round-trip for repeated calls within TTL
    cached = _cache_get(vendor_id)
    if cached:
        return cached

    def _fetch():
        db = get_db()
        return db.table("vendors").select(
            "id,email,store_name,gstin,phone,address,plan,modules,plan_expires_at,is_active,is_admin"
        ).eq("id", vendor_id).single().execute()

    result = await asyncio.to_thread(_fetch)
    if not result.data:
        raise HTTPException(status_code=401, detail="Vendor not found")
    vendor = result.data
    if not vendor["is_active"]:
        raise HTTPException(status_code=403, detail="Account suspended")
    _cache_set(vendor_id, vendor)
    return vendor


async def get_current_admin(vendor=Depends(get_current_vendor)):
    if not vendor.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return vendor


def require_plan(*plans: str):
    async def check(vendor=Depends(get_current_vendor)):
        if vendor["plan"] not in plans:
            raise HTTPException(
                status_code=402,
                detail=f"This feature requires a {' or '.join(plans)} plan.",
            )
        if vendor.get("plan_expires_at"):
            expires = datetime.fromisoformat(vendor["plan_expires_at"])
            if expires < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=402,
                    detail="Your subscription has expired. Please renew.",
                )
        return vendor
    return check