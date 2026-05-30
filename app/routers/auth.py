from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
    RegisterOtpRequired, RegisterConfirm,
)
from app.core.config import settings
from app.core.whatsapp import send_otp as _send_whatsapp_otp, _normalize_phone


def _send_reset_email(to_email: str, store_name: str, reset_url: str) -> None:
    if not settings.smtp_host:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your DukaanAI password"
        msg["From"] = settings.smtp_from
        msg["To"] = to_email
        text = (
            f"Hi {store_name},\n\n"
            f"Reset your DukaanAI password by visiting:\n{reset_url}\n\n"
            "This link expires in 1 hour. If you didn't request this, ignore this email."
        )
        html = f"""<div style="font-family:sans-serif;max-width:480px">
<h2 style="color:#1D9E75">DukaanAI Password Reset</h2>
<p>Hi <b>{store_name}</b>,</p>
<p>Click the button below to reset your password:</p>
<p><a href="{reset_url}" style="display:inline-block;background:#1D9E75;color:#fff;padding:10px 22px;border-radius:7px;text-decoration:none;font-weight:600">Reset Password</a></p>
<p style="font-size:12px;color:#666">Or copy this link: {reset_url}</p>
<p style="font-size:12px;color:#888">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
</div>"""
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())
    except Exception:
        pass

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_phone_local(raw: str) -> str:
    """Strip spaces/dashes and leading country code → bare 10-digit number."""
    p = raw.replace(" ", "").replace("-", "")
    if p.startswith("+91"): p = p[3:]
    elif p.startswith("91") and len(p) == 12: p = p[2:]
    elif p.startswith("0"): p = p[1:]
    return p


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


def _issue_tokens(db, vendor: dict) -> TokenResponse:
    """Create access + refresh tokens for a newly authenticated vendor."""
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
        modules=vendor.get("modules", ["kirana"]),
    )


def _send_otp_email(to_email: str, store_name: str, otp: str) -> bool:
    """Send a 6-digit OTP to the user's email via SMTP. Returns False if SMTP not configured."""
    if not settings.smtp_host:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🔐 {otp} is your DukaanAI verification code"
        msg["From"]    = settings.smtp_from
        msg["To"]      = to_email
        text = (
            f"Hi {store_name},\n\n"
            f"Your DukaanAI verification code is: {otp}\n\n"
            f"Valid for 10 minutes. Do not share this code with anyone."
        )
        html = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto">
<h2 style="color:#1D9E75">DukaanAI Verification</h2>
<p>Hi <b>{store_name}</b>,</p>
<p>Use the code below to complete your registration:</p>
<div style="text-align:center;margin:28px 0;padding:20px;background:#f0faf6;border-radius:12px">
  <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1D9E75">{otp}</span>
</div>
<p style="font-size:12px;color:#666">Valid for <b>10 minutes</b>. Do not share this code.</p>
<p style="font-size:11px;color:#aaa">If you didn't request this, ignore this email.</p>
</div>"""
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html,  "html"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as s:
            s.starttls()
            s.login(settings.smtp_user, settings.smtp_pass)
            s.sendmail(settings.smtp_from, to_email, msg.as_string())
        return True
    except Exception:
        return False


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

    if not settings.smtp_host:
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured. Please contact support."
        )

    # Reject duplicate email up front
    if db.table("vendors").select("id").eq("email", email).execute().data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Validate phone if provided (stored but not used for OTP)
    phone = None
    if body.phone:
        phone = _normalize_phone_local(body.phone)
        if len(phone) != 10 or not phone.isdigit():
            raise HTTPException(status_code=422, detail="Enter a valid 10-digit Indian mobile number")
        if db.table("vendors").select("id").eq("phone", phone).execute().data:
            raise HTTPException(status_code=409, detail="Phone number already registered")

    # Generate OTP — store with email as key (reuses otp_codes table)
    otp        = str(secrets.randbelow(900000) + 100000)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    db.table("otp_codes").delete().eq("phone", email).execute()   # phone col used as generic key
    db.table("otp_codes").insert({
        "phone":      email,
        "code_hash":  _otp_hash(otp),
        "expires_at": expires_at,
        "attempts":   0,
    }).execute()

    # Send OTP email (run sync SMTP in thread pool)
    import asyncio
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
        "modules":       body.modules or ["kirana"],
    })

    return RegisterOtpRequired(
        status="otp_required",
        email=email,
        pending_token=pending_token,
    )


@router.post("/register/confirm", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute")
async def register_confirm(request: Request, body: RegisterConfirm):
    """
    Complete phone-verified registration.
    Verifies the OTP, then creates the vendor account and issues tokens.
    """
    db = get_db()

    # Decode pending registration data
    pending = _decode_pending_token(body.pending_token)
    email   = pending["email"]   # OTP was keyed by email
    otp     = body.otp.strip()

    # Verify OTP — keyed by email in the phone column
    row = db.table("otp_codes").select("*").eq("phone", email).execute()
    if not row.data:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Please start registration again.")

    record = row.data[0]

    if record["attempts"] >= 5:
        db.table("otp_codes").delete().eq("phone", email).execute()
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Please start registration again.")

    if datetime.fromisoformat(record["expires_at"]) < datetime.now(timezone.utc):
        db.table("otp_codes").delete().eq("phone", email).execute()
        raise HTTPException(status_code=400, detail="OTP expired. Please start registration again.")

    if record["code_hash"] != _otp_hash(otp):
        db.table("otp_codes").update({"attempts": record["attempts"] + 1}).eq("phone", email).execute()
        remaining = 5 - record["attempts"] - 1
        raise HTTPException(status_code=400, detail=f"Incorrect OTP. {remaining} attempt(s) left.")

    # OTP valid — clean up
    db.table("otp_codes").delete().eq("phone", email).execute()

    # Final duplicate checks (race condition guard)
    if db.table("vendors").select("id").eq("email", email).execute().data:
        raise HTTPException(status_code=409, detail="Email already registered")

    phone = pending.get("phone")
    if phone and db.table("vendors").select("id").eq("phone", phone).execute().data:
        raise HTTPException(status_code=409, detail="Phone number already registered")

    # Create the verified vendor account
    vendor = db.table("vendors").insert({
        "email":          email,
        "password_hash":  pending["password_hash"],
        "store_name":     pending["store_name"],
        "phone":          phone,
        "gstin":          pending.get("gstin"),
        "plan":           "free",
        "modules":        pending.get("modules", ["kirana"]),
        "phone_verified": bool(phone),
    }).execute().data[0]

    return _issue_tokens(db, vendor)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, body: VendorLogin):
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

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")

    vendor = result.data[0]
    if not verify_password(body.password, vendor["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email/phone or password")
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
        modules=vendor.get("modules", ["kirana"]),
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
        modules=vendor.get("modules", ["kirana"]),
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


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest):
    db = get_db()
    result = db.table("vendors").select("id,email,store_name").eq("email", body.email).execute()

    # Always return success to prevent email enumeration
    _MSG = "If that email is registered, you'll receive a reset link shortly."
    if not result.data:
        return MessageResponse(message=_MSG)

    vendor = result.data[0]
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
    _send_reset_email(vendor["email"], vendor["store_name"], reset_url)

    return MessageResponse(message=_MSG)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
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
async def verify_otp(request: Request, body: VerifyOtpRequest):
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

    vendor = vendor_result.data[0]
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
