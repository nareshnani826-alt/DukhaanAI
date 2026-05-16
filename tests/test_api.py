"""
DukaanAI API Tests
Run with: pytest tests/ -v
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Mock Supabase before importing app
mock_db = MagicMock()

with patch("app.core.database.create_client", return_value=mock_db):
    from app.main import app

client = TestClient(app)


# ── Helpers ──────────────────────────────────────────────────

def make_vendor(plan="free", is_active=True, is_admin=False):
    return {
        "id": "vendor-uuid-001",
        "email": "test@sharma.com",
        "store_name": "Sharma General Stores",
        "gstin": "36AABCU9603R1ZX",
        "phone": "9876543210",
        "address": None,
        "plan": plan,
        "plan_expires_at": None,
        "is_active": is_active,
        "is_admin": is_admin,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
        "password_hash": "$2b$12$fakehash",
    }


def auth_headers():
    from app.core.security import create_access_token
    token = create_access_token({"sub": "vendor-uuid-001", "plan": "free"})
    return {"Authorization": f"Bearer {token}"}


# ── Health ───────────────────────────────────────────────────

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["app"] == "DukaanAI"


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ── Auth ─────────────────────────────────────────────────────

def test_register_success():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.execute.return_value.data = []
    new_vendor = make_vendor()
    mock_table.insert.return_value.execute.return_value.data = [new_vendor]

    r = client.post("/auth/register", json={
        "email": "new@shop.com",
        "password": "securepass123",
        "store_name": "New Shop",
    })
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["plan"] == "free"


def test_register_duplicate_email():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.execute.return_value.data = [{"id": "existing"}]

    r = client.post("/auth/register", json={
        "email": "existing@shop.com",
        "password": "securepass123",
        "store_name": "Duplicate Shop",
    })
    assert r.status_code == 409


def test_register_weak_password():
    r = client.post("/auth/register", json={
        "email": "weak@shop.com",
        "password": "123",
        "store_name": "Weak Pass Shop",
    })
    assert r.status_code == 422


def test_login_wrong_password():
    from app.core.security import hash_password
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    vendor = make_vendor()
    vendor["password_hash"] = hash_password("correctpassword")
    mock_table.select.return_value.eq.return_value.execute.return_value.data = [vendor]

    r = client.post("/auth/login", json={
        "email": "test@sharma.com",
        "password": "wrongpassword",
    })
    assert r.status_code == 401


# ── Products ─────────────────────────────────────────────────

def test_list_products_requires_auth():
    r = client.get("/products")
    assert r.status_code == 403


def test_list_products_authenticated():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [make_vendor()]
    mock_table.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    r = client.get("/products", headers=auth_headers())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_product():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [make_vendor()]
    mock_table.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    new_product = {
        "id": "prod-uuid-001",
        "vendor_id": "vendor-uuid-001",
        "name": "Tata Salt 1kg",
        "sku": "TS-001",
        "category": "Staples",
        "stock": 100,
        "min_stock": 20,
        "mrp": 28.0,
        "cost_price": 22.0,
        "gst_percent": 5,
        "is_active": True,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }
    mock_table.insert.return_value.execute.return_value.data = [new_product]

    r = client.post("/products", headers=auth_headers(), json={
        "name": "Tata Salt 1kg",
        "sku": "TS-001",
        "category": "Staples",
        "stock": 100,
        "min_stock": 20,
        "mrp": 28.0,
        "cost_price": 22.0,
        "gst_percent": 5,
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Tata Salt 1kg"


def test_invalid_gst_percent():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [make_vendor()]

    r = client.post("/products", headers=auth_headers(), json={
        "name": "Test Product",
        "mrp": 100.0,
        "cost_price": 80.0,
        "gst_percent": 7,  # invalid
    })
    assert r.status_code == 422


# ── Sales ────────────────────────────────────────────────────

def test_record_sale_insufficient_stock():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [make_vendor()]

    product = {
        "id": "prod-uuid-001",
        "vendor_id": "vendor-uuid-001",
        "name": "Tata Salt 1kg",
        "stock": 2,
        "mrp": 28.0,
        "is_active": True,
    }
    mock_table.select.return_value.eq.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = [product]

    r = client.post("/sales", headers=auth_headers(), json={
        "product_id": "prod-uuid-001",
        "qty": 10,  # more than stock
    })
    assert r.status_code == 400
    assert "Insufficient stock" in r.json()["detail"]


# ── Subscriptions ────────────────────────────────────────────

def test_list_plans_public():
    """Plans endpoint must be public — no auth needed."""
    r = client.get("/subscriptions/plans")
    assert r.status_code == 200
    plans = r.json()["plans"]
    assert len(plans) == 3
    assert plans[0]["id"] == "free"
    assert plans[1]["price_monthly"] == 299


# ── Invoices ─────────────────────────────────────────────────

def test_invoice_empty_items():
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [make_vendor()]

    r = client.post("/invoices", headers=auth_headers(), json={
        "customer_name": "Ravi Kirana",
        "items": [],  # empty — should fail
    })
    assert r.status_code == 422


def test_gst_summary_requires_auth():
    r = client.get("/invoices/summary/gst?month=5&year=2026")
    assert r.status_code == 403
