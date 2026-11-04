from datetime import datetime, timedelta, timezone
import hashlib
import logging
import secrets

from fastapi import APIRouter, HTTPException, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_vendor,
)
from app.schemas.schemas import (
    VendorRegister, VendorLogin, TokenResponse,
    RefreshRequest, VendorProfile, VendorUpdate, MessageResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
    SendOtpRequest, VerifyOtpRequest,
    RegisterOtpRequired, RegisterConfirm, StaffLogin, DeleteAccountRequest,
)
from app.core.config import settings
from app.core.mailer import email_configured, send_email
from app.core.whatsapp import send_otp as _send_whatsapp_otp, _normalize_phone


def _send_reset_email(to_email: str, store_name: str, reset_url: str) -> None:
    text = (
        f"Hi {store_name},\n\n"
        f"Reset your DukhaanAI password by visiting:\n{reset_url}\n\n"
        "This link expires in 1 hour. If you didn't request this, ignore this email."
    )
    html = f"""<div style="font-family:sans-serif;max-width:480px">
<h2 style="color:#1D9E75">DukhaanAI Password Reset</h2>
<p>Hi <b>{store_name}</b>,</p>
<p>Click the button below to reset your password:</p>
<p><a href="{reset_url}" style="display:inline-block;background:#1D9E75;color:#fff;padding:10px 22px;border-radius:7px;text-decoration:none;font-weight:600">Reset Password</a></p>
<p style="font-size:12px;color:#666">Or copy this link: {reset_url}</p>
<p style="font-size:12px;color:#888">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
</div>"""
    send_email(to_email, "Reset your DukhaanAI password", text, html)

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_phone_local(raw: str) -> str:
    """Strip spaces/dashes and leading country code → bare 10-digit number."""
    p = raw.replace(" ", "").replace("-", "")
    if p.startswith("+91"): p = p[3:]
    elif p.startswith("91") and len(p) == 12: p = p[2:]
    elif p.startswith("0"): p = p[1:]
    return p


# Each email / phone can have one account per shop type (scripts/separate_shop_accounts.sql)
SHOP_TYPES = ("kirana", "chai", "bangle_fancy")
SHOP_LABELS = {"kirana": "Kirana", "chai": "Chai shop", "bangle_fancy": "Bangle store"}
# Shop types not open for sign-up yet (the app hides them too: frontend/src/utils/features.js)
NEW_SIGNUPS_OFF = {"bangle_fancy"}


def _shop_type(value) -> str | None:
    """'chai' or ['chai'] → 'chai'; anything unknown → None."""
    if isinstance(value, list):
        value = next((m for m in value if m in SHOP_TYPES), None)
    return value if value in SHOP_TYPES else None


def _choose_account(rows: list[dict], shop_type: str | None, check, bad: HTTPException) -> dict:
    """Pick the account to sign in to from all accounts of one email / phone.

    `check(row)` says whether the password / PIN opens that account. The account of the asked
    shop type wins; otherwise the only account the credential opens (the app then offers to open
    it or create the missing shop). Several possible accounts → 409 so the app asks which shop.
    """
    ok = [r for r in rows if check(r)]
    if not ok:
        raise bad
    exact = [r for r in ok if r.get("shop_type", "kirana") == shop_type]
    if exact:
        return exact[0]
    if len(ok) == 1:
        return ok[0]
    raise HTTPException(status_code=409, detail={
        "choose_shop": [r.get("shop_type", "kirana") for r in ok],
        "message": "You have more than one shop with this login. Pick the shop to open.",
    })


def _make_pending_token(data: dict) -> str:
    """Sign a short-lived JWT carrying pending registration payload."""
    from jose import jwt as _jwt
    payload = {**data, "type": "pending_reg",
                "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
    return _jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode_pending_token(token: str) -> dict:
    from jose import jwt as _jwt, JWTError
    try:
        payload = _jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "pending_reg":
            raise ValueError("wrong token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=400, detail="Registration session expired. Please start again.")


def _issue_tokens(db, vendor: dict, staff: dict | None = None) -> TokenResponse:
    """Create access + refresh tokens for a newly authenticated vendor (or one of its staff)."""
    claims = {"sub": vendor["id"], "plan": vendor["plan"]}
    if staff:
        claims.update(role=staff["role"], staff_id=staff["id"])
    access_token = create_access_token(claims)
    raw_refresh, hashed_refresh = create_refresh_token()
    row = {
        "vendor_id": vendor["id"],
        "token_hash": hashed_refresh,
        "expires_at": (
            datetime.now(timezone.utc)
            + timedelta(days=settings.jwt_refresh_token_expire_days)
        ).isoformat(),
    }
    if staff:
        row["staff_id"] = staff["id"]
    db.table("refresh_tokens").insert(row).execute()
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        vendor_id=vendor["id"],
        store_name=vendor["store_name"],
        plan=vendor["plan"],
        modules=vendor.get("modules", ["kirana"]),
        role=staff["role"] if staff else "owner",
        staff_name=staff["username"] if staff else None,
    )


def _send_otp_email(to_email: str, store_name: str, otp: str) -> bool:
    """Send a 6-digit OTP to the user's email. Returns False if it couldn't be sent."""
    text = (
        f"Hi {store_name},\n\n"
        f"Your DukhaanAI verification code is: {otp}\n\n"
        f"Valid for 10 minutes. Do not share this code with anyone."
    )
    html = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto">
<h2 style="color:#1D9E75">DukhaanAI Verification</h2>
<p>Hi <b>{store_name}</b>,</p>
<p>Use the code below to complete your registration:</p>
<div style="text-align:center;margin:28px 0;padding:20px;background:#f0faf6;border-radius:12px">
  <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1D9E75">{otp}</span>
</div>
<p style="font-size:12px;color:#666">Valid for <b>10 minutes</b>. Do not share this code.</p>
<p style="font-size:11px;color:#aaa">If you didn't request this, ignore this email.</p>
</div>"""
    return send_email(to_email, f"🔐 {otp} is your DukhaanAI verification code", text, html)


@router.post("/register")
@limiter.limit("10/minute")
async def register(request: Request, body: VendorRegister):
    """
    Register a new vendor.
    Always sends a 6-digit OTP to the email address before creating the account.
    Call POST /auth/register/confirm with the OTP to complete registration.
    """
    db = get_db()
    email = str(body.email)
    shop = _shop_type(body.modules) or "kirana"
    if shop in NEW_SIGNUPS_OFF:
        raise HTTPException(status_code=403, detail=f"{SHOP_LABELS[shop]} accounts are not open yet. Please choose Kirana or Chai shop.")
    otp_key = f"{email}|{shop}"

    # Production must send real emails. In local development without SMTP, the OTP is
    # printed to the backend console instead so sign-up can still be tested.
    dev_otp_to_console = not email_configured() and settings.app_env != "production"
    if not email_configured() and not dev_otp_to_console:
        logging.error("Registration blocked: neither BREVO_API_KEY nor SMTP_HOST is set")
        raise HTTPException(
            status_code=503,
            detail="Sign-up is temporarily unavailable. Please try again later."
        )

    # One account per shop type: the same email may already run a different kind of shop
    if db.table("vendors").select("id").eq("email", email).eq("shop_type", shop).execute().data:
        raise HTTPException(status_code=409, detail=f"This email already has a {SHOP_LABELS[shop]} account. Please sign in.")

    # Validate phone if provided (stored but not used for OTP)
    phone = None
    if body.phone:
        phone = _normalize_phone_local(body.phone)
        if len(phone) != 10 or not phone.isdigit():
            raise HTTPException(status_code=422, detail="Enter a valid 10-digit Indian mobile number")
        if db.table("vendors").select("id").eq("phone", phone).eq("shop_type", shop).execute().data:
            raise HTTPException(status_code=409, detail=f"This phone number already has a {SHOP_LABELS[shop]} account.")

    # Generate OTP — store with email as key (reuses otp_codes table)
    otp        = str(secrets.randbelow(900000) + 100000)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    db.table("otp_codes").delete().eq("phone", otp_key).execute()   # phone col used as generic key
    db.table("otp_codes").insert({
        "phone":      otp_key,
        "code_hash":  _otp_hash(otp),
        "expires_at": expires_at,
        "attempts":   0,
    }).execute()

    # Send OTP email (run sync SMTP in thread pool)
    import asyncio
    if dev_otp_to_console:
        print(f"\n[DEV] SMTP not configured — sign-up OTP for {email}: {otp}\n", flush=True)
        sent = True
    else:
        sent = await asyncio.to_thread(_send_otp_email, email, body.store_name, otp)
    if not sent:
        raise HTTPException(status_code=502, detail="Failed to send verification email. Please try again.")

    # Sign a short-lived pending token (10 min, same as OTP)
    pending_token = _make_pending_token({
        "email":         email,
        "password_hash": hash_password(body.password),
        "store_name":    body.store_name,
        "phone":         phone,
        "gstin":         body.gstin,
        "modules":       [shop],
        "shop_type":     shop,
    })

    return RegisterOtpRequired(
        status="otp_required",
        email=email,
        pending_token=pending_token,
    )


@router.post("/register/confirm", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute")
def register_confirm(request: Request, body: RegisterConfirm):
    """
    Complete phone-verified registration.
    Verifies the OTP, then creates the vendor account and issues tokens.
    """
    db = get_db()

    # Decode pending registration data
    pending = _decode_pending_token(body.pending_token)
    email   = pending["email"]
    shop    = pending.get("shop_type", "kirana")
    otp_key = f"{email}|{shop}"   # OTP was keyed by email + shop type
    otp     = body.otp.strip()

    # Verify OTP — keyed by email in the phone column
    row = db.table("otp_codes").select("*").eq("phone", otp_key).execute()
    if not row.data:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please start registration again.")

    record = row.data[0]

    if record["attempts"] >= 5:
        db.table("otp_codes").delete().eq("phone", otp_key).execute()
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Please start registration again.")

    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        db.table("otp_codes").delete().eq("phone", otp_key).execute()
        raise HTTPException(status_code=400, detail="OTP expired. Please start registration again.")

    if record["code_hash"] != _otp_hash(otp):
        db.table("otp_codes").update({"attempts": record["attempts"] + 1}).eq("phone", otp_key).execute()
        remaining = 5 - record["attempts"] - 1
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) left.")

    # OTP valid — clean up
    db.table("otp_codes").delete().eq("phone", otp_key).execute()

    # Final duplicate checks (race condition guard)
    if db.table("vendors").select("id").eq("email", email).eq("shop_type", shop).execute().data:
        raise HTTPException(status_code=409, detail=f"This email already has a {SHOP_LABELS[shop]} account. Please sign in.")

    phone = pending.get("phone")
    if phone and db.table("vendors").select("id").eq("phone", phone).eq("shop_type", shop).execute().data:
        raise HTTPException(status_code=409, detail=f"This phone number already has a {SHOP_LABELS[shop]} account.")

    # Create the verified vendor account
    vendor = db.table("vendors").insert({
        "email":          email,
        "password_hash":  pending["password_hash"],
        "store_name":     pending["store_name"],
        "phone":          phone,
        "gstin":          pending.get("gstin"),
        "plan":           "free",
        "modules":        [shop],
        "shop_type":      shop,
        "phone_verified": bool(phone),
    }).execute().data[0]

    return _issue_tokens(db, vendor)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, body: VendorLogin):
    db = get_db()

    # Accept email or phone number
    ident = body.identifier.strip()
    if "@" in ident:
        result = db.table("vendors").select("*").eq("email", ident.lower()).execute()
    else:
        # Normalize: strip +91 / 91 / leading 0 to get bare 10-digit number
        p = ident.replace(" ", "").replace("-", "")
        if p.startswith("+91"): p = p[3:]
        elif p.startswith("91") and len(p) == 12: p = p[2:]
        elif p.startswith("0"): p = p[1:]
        result = db.table("vendors").select("*").eq("phone", p).execute()
        if not result.data:
            result = db.table("vendors").select("*").eq("phone", ident).execute()

    vendor = _choose_account(
        result.data, _shop_type(body.shop_type),
        lambda r: verify_password(body.password, r["password_hash"]),
        HTTPException(status_code=401, detail="Invalid email/phone or password"),
    )
    if not vendor["is_active"]:
        raise HTTPException(status_code=403, detail="Account suspended")
    return _issue_tokens(db, vendor)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest):
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
    staff = None
    if record.get("staff_id"):
        rows = db.table("staff").select("id,username,role,is_active").eq("id", record["staff_id"]).execute().data
        if not rows or not rows[0]["is_active"]:
            db.table("refresh_tokens").delete().eq("token_hash", token_hash).execute()
            raise HTTPException(status_code=401, detail="Staff access removed, please ask the owner")
        staff = rows[0]

    # Rotate refresh token
    db.table("refresh_tokens").delete().eq("token_hash", token_hash).execute()
    return _issue_tokens(db, vendor, staff)


@router.post("/staff-login", response_model=TokenResponse)
@limiter.limit("10/minute")
def staff_login(request: Request, body: StaffLogin):
    db = get_db()
    shop = body.shop.strip()
    if "@" in shop:
        found = db.table("vendors").select("*").eq("email", shop.lower()).execute().data
    else:
        found = db.table("vendors").select("*").eq("phone", _normalize_phone_local(shop)).execute().data

    bad = HTTPException(status_code=401, detail="Wrong shop, username or PIN")
    if not found:
        raise bad
    # The owner may run several shop types; find the one this username and PIN belong to
    staff_of = {}
    for v in found:
        rows = (
            db.table("staff").select("id,username,role,is_active,pin_hash")
            .eq("vendor_id", v["id"]).eq("username", body.username.strip().lower()).execute().data
        )
        if rows:
            staff_of[v["id"]] = rows[0]
    vendor = _choose_account(
        [v for v in found if v["id"] in staff_of], _shop_type(body.shop_type),
        lambda v: verify_password(body.pin, staff_of[v["id"]]["pin_hash"]), bad,
    )
    staff = staff_of[vendor["id"]]
    if not staff["is_active"] or not vendor["is_active"]:
        raise HTTPException(status_code=403, detail="This staff login is switched off. Ask the owner.")
    return _issue_tokens(db, vendor, staff)


@router.post("/logout", response_model=MessageResponse)
def logout(body: RefreshRequest, vendor=Depends(get_current_vendor)):
    from app.core.security import bust_vendor_cache
    db = get_db()
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    db.table("refresh_tokens").delete().eq("token_hash", token_hash).execute()
    bust_vendor_cache(vendor["id"])
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=VendorProfile)
async def me(vendor=Depends(get_current_vendor)):
    return vendor


@router.patch("/me", response_model=VendorProfile)
def update_profile(body: VendorUpdate, vendor=Depends(get_current_vendor)):
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


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest):
    db = get_db()
    result = db.table("vendors").select("id,email,store_name,shop_type").eq("email", str(body.email).strip().lower()).execute()

    # Always return success to prevent email enumeration
    _MSG = "If that email is registered, you'll receive a reset link shortly."
    if not result.data:
        return MessageResponse(message=_MSG)

    # Each shop type is its own account with its own password: reset the asked one, else all
    accounts = [v for v in result.data if v.get("shop_type") == _shop_type(body.shop_type)] or result.data
    for vendor in accounts:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

        # Replace any existing token for this vendor
        db.table("password_reset_tokens").delete().eq("vendor_id", vendor["id"]).execute()
        db.table("password_reset_tokens").insert({
            "vendor_id": vendor["id"],
            "token_hash": token_hash,
            "expires_at": expires_at,
        }).execute()

        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        name = vendor["store_name"] if len(accounts) == 1 else f'{vendor["store_name"]} ({SHOP_LABELS.get(vendor.get("shop_type"), "Shop")})'
        _send_reset_email(vendor["email"], name, reset_url)

    return MessageResponse(message=_MSG)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest):
    db = get_db()
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()

    row = db.table("password_reset_tokens").select("*, vendors(*)").eq("token_hash", token_hash).execute()
    if not row.data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    record = row.data[0]
    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        db.table("password_reset_tokens").delete().eq("token_hash", token_hash).execute()
        raise HTTPException(status_code=400, detail="Reset link expired. Please request a new one.")

    vendor = record["vendors"]
    db.table("vendors").update({"password_hash": hash_password(body.new_password)}).eq("id", vendor["id"]).execute()
    db.table("password_reset_tokens").delete().eq("token_hash", token_hash).execute()

    return MessageResponse(message="Password updated successfully. You can now log in.")


# ── Delete account (Google Play: users must be able to delete their account) ──

# Shop data, children before parents. Every table also cascades from vendors,
# but deleting explicitly means a table created without the cascade can't block it.
_VENDOR_TABLES = (
    "sales", "invoices", "bangle_sales", "bangle_variants", "bangle_products",
    "bangle_suppliers", "chai_orders", "chai_menu", "chai_materials",
    "udhar_transactions", "udhar_customers", "customers", "wastage_records",
    "day_sessions", "agent_suggestions", "vendor_learned_patterns", "ai_usage",
    "staff", "refresh_tokens", "password_reset_tokens", "subscriptions",
    "vendor_contacts", "products",
)


def _wipe_vendor(vendor_id: str, email: str | None, phone: str | None) -> None:
    db = get_db()
    for table in _VENDOR_TABLES:
        try:
            db.table(table).delete().eq("vendor_id", vendor_id).execute()
        except Exception as exc:  # table missing in this database, or already cascaded
            logging.warning("delete account: %s skipped (%s)", table, exc)
    # Shared tables: keep the rows other shops use, drop the link to this shop
    for table, col in (("community_products", "added_by"), ("global_vocab", "created_by"),
                       ("payment_events", "vendor_id")):
        try:
            db.table(table).update({col: None}).eq(col, vendor_id).execute()
        except Exception as exc:
            logging.warning("delete account: %s unlink skipped (%s)", table, exc)
    for key in filter(None, (email, phone)):
        try:
            db.table("otp_codes").delete().eq("phone", key).execute()
        except Exception:
            pass
    db.table("vendors").delete().eq("id", vendor_id).execute()


@router.post("/me/delete", response_model=MessageResponse)
@limiter.limit("5/minute")
async def delete_account(request: Request, body: DeleteAccountRequest, vendor=Depends(get_current_vendor)):
    """Permanently delete this shop account and all its data. Owner only (roles.py
    blocks staff from writes under /auth/me) and the password must be typed again."""
    import asyncio
    from app.core.security import bust_vendor_cache

    def _check():
        db = get_db()
        rows = db.table("vendors").select("id,password_hash,email,phone").eq("id", vendor["id"]).execute().data
        if not rows or not rows[0].get("password_hash") or not verify_password(body.password, rows[0]["password_hash"]):
            raise HTTPException(status_code=401, detail="Wrong password")
        subs = db.table("subscriptions").select("razorpay_sub_id").eq("vendor_id", vendor["id"]).eq("status", "active").execute().data
        return rows[0], subs

    row, subs = await asyncio.to_thread(_check)

    # Stop future Razorpay charges before the record of the subscription is gone
    if subs:
        from app.routers.subscriptions import _rz_cancel
        for s in subs:
            if s.get("razorpay_sub_id"):
                try:
                    await _rz_cancel(s["razorpay_sub_id"])
                except Exception as exc:
                    logging.error("delete account: Razorpay cancel failed for %s (%s)", s["razorpay_sub_id"], exc)

    await asyncio.to_thread(_wipe_vendor, vendor["id"], row.get("email"), row.get("phone"))
    bust_vendor_cache(vendor["id"])
    return MessageResponse(message="Your account and shop data have been deleted.")


# ── WhatsApp OTP login ─────────────────────────────────────────

def _otp_hash(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


@router.post("/send-otp", response_model=MessageResponse)
@limiter.limit("5/minute")
async def send_otp(request: Request, body: SendOtpRequest):
    db = get_db()
    phone = _normalize_phone(body.phone)

    # Vendor must have this phone registered
    result = db.table("vendors").select("id,store_name,is_active").eq("phone", phone).execute()
    if not result.data:
        # Generic message to avoid phone enumeration
        return MessageResponse(message="OTP sent to your WhatsApp if the number is registered.")

    vendor = result.data[0]
    if not vendor["is_active"]:
        raise HTTPException(status_code=403, detail="Account suspended")

    # Generate 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    # Replace any existing OTP for this phone
    db.table("otp_codes").delete().eq("phone", phone).execute()
    db.table("otp_codes").insert({
        "phone": phone,
        "code_hash": _otp_hash(otp),
        "expires_at": expires_at,
        "attempts": 0,
    }).execute()

    # Send via WhatsApp
    try:
        sent = await _send_whatsapp_otp(phone, otp)
        if not sent:
            raise HTTPException(
                status_code=503,
                detail="WhatsApp OTP is not configured. Please contact support."
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send OTP: {str(e)}")

    return MessageResponse(message="OTP sent to your WhatsApp. Valid for 10 minutes.")


@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit("10/minute")
def verify_otp(request: Request, body: VerifyOtpRequest):
    db = get_db()
    phone = _normalize_phone(body.phone)
    otp = body.otp.strip()

    row = db.table("otp_codes").select("*").eq("phone", phone).execute()
    if not row.data:
        raise HTTPException(status_code=400, detail="No OTP found. Please request a new one.")

    record = row.data[0]

    # Max 5 attempts before invalidating
    if record["attempts"] >= 5:
        db.table("otp_codes").delete().eq("phone", phone).execute()
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Please request a new OTP.")

    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        db.table("otp_codes").delete().eq("phone", phone).execute()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    if record["code_hash"] != _otp_hash(otp):
        db.table("otp_codes").update({"attempts": record["attempts"] + 1}).eq("phone", phone).execute()
        remaining = 5 - record["attempts"] - 1
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) left.")

    # OTP valid — delete it and issue tokens
    db.table("otp_codes").delete().eq("phone", phone).execute()

    vendor_result = db.table("vendors").select("*").eq("phone", phone).execute()
    if not vendor_result.data:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor = _choose_account(vendor_result.data, _shop_type(body.shop_type), lambda r: True,
                             HTTPException(status_code=404, detail="Vendor not found"))
    if not vendor["is_active"]:
        raise HTTPException(status_code=403, detail="Account suspended")
    return _issue_tokens(db, vendor)
