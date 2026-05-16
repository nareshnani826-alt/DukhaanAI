# DukaanAI — Complete Setup Guide
# Follow every step in order. Takes about 20 minutes total.

# ══════════════════════════════════════════════════════
# STEP 1 — Python virtual environment
# ══════════════════════════════════════════════════════
# Open your terminal inside the dukaanai/ folder, then:

python -m venv venv

# Activate it:
# Windows:
venv\Scripts\activate
# Mac / Linux:
source venv/bin/activate

# You should see (venv) in your terminal prompt now.

# ══════════════════════════════════════════════════════
# STEP 2 — Install all packages
# ══════════════════════════════════════════════════════

pip install -r requirements.txt

# This takes 1-2 minutes. If you see any red errors, run:
# pip install --upgrade pip
# then try again.

# ══════════════════════════════════════════════════════
# STEP 3 — Create your Supabase project (FREE)
# ══════════════════════════════════════════════════════
# 1. Go to https://supabase.com
# 2. Sign up / Log in (free, no credit card)
# 3. Click "New Project"
# 4. Fill in:
#    - Name: dukaanai
#    - Database password: (save this somewhere safe)
#    - Region: Southeast Asia (Singapore) — closest to India
# 5. Wait ~2 minutes for it to start

# ══════════════════════════════════════════════════════
# STEP 4 — Get your Supabase credentials
# ══════════════════════════════════════════════════════
# In Supabase Dashboard → Settings → API:
#   - Project URL          → SUPABASE_URL
#   - anon / public key    → SUPABASE_ANON_KEY
#   - service_role key     → SUPABASE_SERVICE_KEY (keep this secret!)

# ══════════════════════════════════════════════════════
# STEP 5 — Run the database schema
# ══════════════════════════════════════════════════════
# In Supabase Dashboard → SQL Editor → New query
# Copy the ENTIRE contents of scripts/schema.sql
# Paste it in and click "Run"
# You should see: "Success. No rows returned"
# This creates all 8 tables + indexes + triggers.

# ══════════════════════════════════════════════════════
# STEP 6 — Set up your .env file
# ══════════════════════════════════════════════════════

cp .env.example .env

# Now open .env in VS Code and fill in:

SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Generate a strong JWT secret (run this in terminal):
python -c "import secrets; print(secrets.token_hex(32))"
# Copy the output into:
JWT_SECRET_KEY=paste-the-output-here

# For now, leave Razorpay keys as-is (empty).
# The app works without them — Razorpay is only needed for subscriptions.

# ══════════════════════════════════════════════════════
# STEP 7 — Run the server
# ══════════════════════════════════════════════════════

uvicorn app.main:app --reload --port 8000

# You should see:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Started reloader process
# INFO:     Application startup complete.

# ══════════════════════════════════════════════════════
# STEP 8 — Test it's working
# ══════════════════════════════════════════════════════
# Open your browser:
# http://localhost:8000          ← should show app name + version
# http://localhost:8000/docs     ← interactive API explorer (Swagger UI)
# http://localhost:8000/redoc    ← alternative docs

# ══════════════════════════════════════════════════════
# STEP 9 — Create your first vendor (test register)
# ══════════════════════════════════════════════════════
# In the /docs page:
# 1. Click POST /auth/register → "Try it out"
# 2. Paste this body:
{
  "email": "sharma@test.com",
  "password": "testpass123",
  "store_name": "Sharma General Stores",
  "gstin": "36AABCU9603R1ZX",
  "phone": "9876543210"
}
# 3. Click Execute
# 4. You should get back an access_token and refresh_token

# ══════════════════════════════════════════════════════
# STEP 10 — Authenticate in Swagger
# ══════════════════════════════════════════════════════
# 1. Copy the access_token from the register response
# 2. Click the green "Authorize" button at the top of /docs
# 3. Paste: Bearer <your-token>
# 4. Now all routes are authenticated — try GET /products

# ══════════════════════════════════════════════════════
# COMMON ERRORS & FIXES
# ══════════════════════════════════════════════════════

# ERROR: ModuleNotFoundError: No module named 'fastapi'
# FIX: Make sure your venv is activated (see Step 1)

# ERROR: pydantic_settings.main.SettingsError: value not found
# FIX: Your .env file is missing — check Step 6

# ERROR: supabase.exceptions.APIError: relation "vendors" does not exist
# FIX: You haven't run schema.sql yet — do Step 5

# ERROR: jose.exceptions.JWKError
# FIX: JWT_SECRET_KEY is empty — run the python command in Step 6

# ERROR: Port 8000 already in use
# FIX: uvicorn app.main:app --reload --port 8001

# ══════════════════════════════════════════════════════
# USEFUL COMMANDS
# ══════════════════════════════════════════════════════

# Run tests:
pytest tests/ -v

# Check all routes registered:
python -c "from app.main import app; [print(r.path) for r in app.routes]"

# See your Supabase tables:
# Supabase Dashboard → Table Editor

# Watch live logs:
uvicorn app.main:app --reload --log-level debug

# ══════════════════════════════════════════════════════
# FOLDER STRUCTURE CHECK
# ══════════════════════════════════════════════════════
# Make sure your folder looks exactly like this:
#
# dukaanai/
# ├── .env                    ← created from .env.example
# ├── .env.example
# ├── requirements.txt
# ├── README.md
# ├── venv/                   ← created by python -m venv venv
# ├── app/
# │   ├── __init__.py
# │   ├── main.py
# │   ├── core/
# │   │   ├── __init__.py
# │   │   ├── config.py
# │   │   ├── database.py
# │   │   └── security.py
# │   ├── routers/
# │   │   ├── __init__.py
# │   │   ├── auth.py
# │   │   ├── products.py
# │   │   ├── sales.py
# │   │   ├── invoices.py
# │   │   ├── subscriptions.py
# │   │   └── admin.py
# │   └── schemas/
# │       ├── __init__.py
# │       └── schemas.py
# ├── scripts/
# │   └── schema.sql
# └── tests/
#     └── test_api.py
