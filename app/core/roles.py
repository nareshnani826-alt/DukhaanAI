"""
Staff role limits, checked once for every request.

A staff sign-in puts "role" (manager / cashier) in the access token; the
shop owner's token has no role. Rules here are by path so a new endpoint
under a blocked prefix is covered without touching its router.
"""
from fastapi import HTTPException, Request
from jose import JWTError, jwt

from app.core.config import settings

# Owner only: staff, plan / payments, shop profile, platform admin
_OWNER_ONLY = ("/staff", "/subscriptions", "/admin")
_OWNER_ONLY_WRITES = ("/auth/me",)

# Cashier: billing and sales only — can't change stock or products
_CASHIER_NO_WRITES = (
    "/products", "/wastage", "/invoice-scan", "/agent",
    "/bangle/products", "/bangle/variants", "/bangle/suppliers",
    "/bangle/scan-image", "/bangle/parse-text",
)


def _under(path: str, prefixes: tuple[str, ...]) -> bool:
    return any(path == p or path.startswith(p + "/") for p in prefixes)


async def enforce_role(request: Request) -> None:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return  # no token — the endpoint's own auth decides
    try:
        payload = jwt.decode(auth[7:], settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return  # bad token — the endpoint's own auth rejects it
    role = payload.get("role")
    if not role or role == "owner":
        return

    path, write = request.url.path, request.method not in ("GET", "HEAD", "OPTIONS")
    if _under(path, _OWNER_ONLY) or (write and _under(path, _OWNER_ONLY_WRITES)):
        raise HTTPException(status_code=403, detail="Only the shop owner can do this.")
    if role == "cashier" and write and _under(path, _CASHIER_NO_WRITES):
        raise HTTPException(status_code=403, detail="Cashiers can only make bills. Ask the owner or manager.")
