import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from jose import jwt, JWTError

from app.core.config import settings


def _rate_limit_key(request: Request) -> str:
    """Rate-limit by vendor ID from JWT when present, fall back to IP address.

    IP-based limiting is unfair: 10 vendors sharing a network (café, apartment)
    all share one bucket. JWT-based limiting is per-account.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            token = auth.split(" ", 1)[1]
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_exp": False},   # only need sub, skip expiry re-check
            )
            vendor_id = payload.get("sub")
            if vendor_id:
                return f"vendor:{vendor_id}"
        except JWTError:
            pass
    return get_remote_address(request)


# Rate limiter — shared across routers via app.state
limiter = Limiter(key_func=_rate_limit_key)

from app.routers import (
    auth,
    products,
    sales,
    invoices,
    subscriptions,
    admin,
    customers,
    day_sessions,
    udhar,
    wastage,
    community_catalog,
    chat,
    assemblyai,
    voice,
    insights,
    learning,
    invoice_scan,
    expiry,
    bangle,
    vocab,
    agent,
)

_is_dev = settings.app_env != "production"

# Warn loudly if critical env vars are missing — app boots but DB calls will fail
_missing = [k for k, v in {
    "SUPABASE_URL": settings.supabase_url,
    "SUPABASE_ANON_KEY": settings.supabase_anon_key,
    "SUPABASE_SERVICE_KEY": settings.supabase_service_key,
}.items() if not v]
if _missing:
    logging.warning("⚠ Missing environment variables: %s — database operations will fail", ", ".join(_missing))

app = FastAPI(
    title="DukaanAI API",
    description="Inventory & Billing Agent for Kirana and Wholesale vendors",
    version="1.0.0",
    docs_url="/docs"  if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
)

# ── Security headers middleware ───────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"]  = "nosniff"
        response.headers["X-Frame-Options"]          = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]        = "geolocation=(), microphone=(), camera=()"
        if _is_dev is False:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── Rate limiter state + handler ──────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────
_cors_origins = [settings.frontend_url]
if settings.allowed_origins:
    _cors_origins += [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
# Always allow the production Vercel deployment regardless of env-var state
_cors_origins += [
    "https://dukhaan-ai.vercel.app",
    "https://dukhaan-ai-git-master-nareshnani826-alts-projects.vercel.app",
]
# Capacitor Android APK uses https://localhost as its WebView origin
_cors_origins += ["https://localhost", "capacitor://localhost", "http://localhost"]
if _is_dev:
    _cors_origins += ["http://localhost:3000", "http://localhost:5173"]
# Deduplicate while preserving order
_seen: set = set()
_cors_origins = [o for o in _cors_origins if not (o in _seen or _seen.add(o))]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ─────────────────────────────────
# Catches any unhandled Python exception and returns JSON so the response
# flows back through CORSMiddleware (otherwise ServerErrorMiddleware
# intercepts it above CORS and strips the Access-Control-Allow-Origin header).
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logging.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    response = JSONResponse(status_code=500, content={"detail": str(exc) or "Internal server error"})
    # Manually inject CORS headers so the browser can read the error body.
    # Without this, ServerErrorMiddleware intercepts 500s before CORSMiddleware
    # can add Access-Control-Allow-Origin, causing opaque network errors on the client.
    origin = request.headers.get("origin", "")
    if origin in _cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response

# ── Routers ──────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(invoices.router)
app.include_router(subscriptions.router)
app.include_router(admin.router)
app.include_router(customers.router)
app.include_router(day_sessions.router)
app.include_router(udhar.router)
app.include_router(wastage.router)
app.include_router(community_catalog.router)
app.include_router(chat.router)
app.include_router(assemblyai.router)
app.include_router(insights.router)
app.include_router(learning.router)
app.include_router(invoice_scan.router)
app.include_router(expiry.router)
app.include_router(bangle.router)
app.include_router(vocab.router)
app.include_router(agent.router)
app.include_router(
    voice.router,
    prefix="/api/voice",
    tags=["Voice"]
)

# ── Health check ─────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "env": settings.app_env,
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
