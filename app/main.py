import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings

# Rate limiter — shared across routers via app.state
limiter = Limiter(key_func=get_remote_address)

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
