from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
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
)

_is_dev = settings.app_env != "production"

app = FastAPI(
    title="DukaanAI API",
    description="Inventory & Billing Agent for Kirana and Wholesale vendors",
    version="1.0.0",
    docs_url="/docs"  if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
)

# ── Rate limiter state + handler ──────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────
_cors_origins = [settings.frontend_url]
if _is_dev:
    _cors_origins += ["http://localhost:3000", "http://localhost:5173"]

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
