"""
Idempotently create (or fetch) a dedicated E2E test vendor and mint a fresh access
token for it. Bypasses the normal /auth/register flow, which requires SMTP (not
configured locally) to email an OTP — this talks to Supabase directly instead,
using the same hashing/token helpers the real backend uses.

Prints a single JSON line to stdout: {"id", "email", "access_token", "store_name"}
Run with: py scripts/e2e_seed_vendor.py
"""
import json
import sys
from dotenv import load_dotenv

load_dotenv()

from app.core.database import get_db
from app.core.security import hash_password, create_access_token

E2E_EMAIL   = "e2e-test@dukaanai.test"
E2E_PASSWORD = "E2eTest#12345"  # not used by tests directly; token is injected
STORE_NAME  = "E2E Test Store"


def main():
    db = get_db()
    existing = db.table("vendors").select("*").eq("email", E2E_EMAIL).execute().data
    if existing:
        vendor = existing[0]
        # Keep it on the top plan + both store modules so gated pages render fully.
        if vendor.get("plan") != "wholesale" or vendor.get("modules") != ["kirana", "bangle_fancy"]:
            vendor = db.table("vendors").update({
                "plan": "wholesale",
                "modules": ["kirana", "bangle_fancy"],
                "is_active": True,
            }).eq("id", vendor["id"]).execute().data[0]
    else:
        vendor = db.table("vendors").insert({
            "email": E2E_EMAIL,
            "password_hash": hash_password(E2E_PASSWORD),
            "store_name": STORE_NAME,
            "plan": "wholesale",
            "modules": ["kirana", "bangle_fancy"],
            "is_active": True,
        }).execute().data[0]

    token = create_access_token({"sub": vendor["id"], "plan": vendor["plan"]})
    print(json.dumps({
        "id": vendor["id"],
        "email": vendor["email"],
        "store_name": vendor["store_name"],
        "plan": vendor["plan"],
        "access_token": token,
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
