from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, products, sales, invoices, subscriptions, admin, customers, day_sessions, udhar, wastage, community_catalog, chat, assemblyai

app = FastAPI(
    title="DukaanAI API",
    description="Inventory & Billing Agent for Kirana and Wholesale vendors",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173"],
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

# ── Health check ─────────────────────────────────────────────
@app.get("/", tags=["health"])
async def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "env": settings.app_env,
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
