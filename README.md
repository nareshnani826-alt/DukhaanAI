# DukaanAI Backend — FastAPI + Supabase

## Stack
- **FastAPI** — Python REST API
- **Supabase** — PostgreSQL database + Auth
- **Razorpay** — Subscription billing
- **JWT** — Secure vendor authentication

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in your Supabase and Razorpay credentials
```

### 3. Set up the database
- Go to your Supabase project → SQL Editor
- Run the full contents of `scripts/schema.sql`

### 4. Run the server
```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Open API docs
```
http://localhost:8000/docs
```

## Project Structure
```
dukaanai/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── core/
│   │   ├── config.py        # Settings & env vars
│   │   ├── database.py      # Supabase client
│   │   └── security.py      # JWT + password hashing
│   ├── models/              # SQLAlchemy-style models (for reference)
│   ├── schemas/
│   │   ├── vendor.py        # Vendor request/response schemas
│   │   ├── product.py       # Product schemas
│   │   ├── sale.py          # Sale schemas
│   │   ├── invoice.py       # Invoice schemas
│   │   └── subscription.py  # Plan + payment schemas
│   └── routers/
│       ├── auth.py          # Register, login, refresh
│       ├── products.py      # CRUD inventory
│       ├── sales.py         # Record & list sales
│       ├── invoices.py      # Generate GST invoices
│       ├── vendors.py       # Vendor profile & settings
│       ├── subscriptions.py # Razorpay plan management
│       └── admin.py         # Admin-only routes
├── scripts/
│   └── schema.sql           # Full Supabase DB schema
├── tests/
│   └── test_api.py          # Core API tests
├── .env.example
└── requirements.txt
```

## API Overview
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | New vendor signup |
| POST | `/auth/login` | Get JWT token |
| GET | `/products` | List all products |
| POST | `/products` | Add product |
| PUT | `/products/{id}` | Update stock/details |
| POST | `/sales` | Record a sale |
| GET | `/sales` | Sales history |
| POST | `/invoices/generate` | Create GST invoice |
| GET | `/invoices/{id}` | Get invoice |
| POST | `/subscriptions/create` | Start Razorpay subscription |
| POST | `/subscriptions/webhook` | Razorpay payment webhook |
| GET | `/admin/vendors` | List all vendors (admin) |
| GET | `/admin/revenue` | Revenue dashboard (admin) |
