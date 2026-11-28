"""Website payment (Razorpay Standard Checkout): verify, add 30 days once, refuse anything off."""
import asyncio
import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.routers import subscriptions as subs

SECRET = "test_secret"
PRICE = subs.PLAN_PRICING["pro"]["monthly"]["amount"]


class _Q:
    """Tiny stand-in for the Supabase query builder over in-memory rows."""
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.op, self.data = db, table, [], "select", None
    def select(self, *_): return self
    def eq(self, k, v): self.filters.append((k, v)); return self
    def limit(self, _): return self
    def update(self, data): self.op, self.data = "update", data; return self
    def insert(self, data): self.op, self.data = "insert", data; return self
    def execute(self):
        rows = self.db.rows.setdefault(self.table, [])
        hit = [r for r in rows if all(r.get(k) == v for k, v in self.filters)]
        if self.op == "insert":
            rows.append(dict(self.data)); hit = [self.data]
        elif self.op == "update":
            for r in hit: r.update(self.data)
        return type("R", (), {"data": hit})()


class FakeDB:
    def __init__(self, vendor):
        self.rows = {"vendors": [vendor], "payment_events": []}
    def table(self, name): return _Q(self, name)


@pytest.fixture
def shop(monkeypatch):
    monkeypatch.setattr(settings, "razorpay_key_id", "rzp_test_x")
    monkeypatch.setattr(settings, "razorpay_key_secret", SECRET)
    monkeypatch.setattr(subs, "bust_vendor_cache", lambda _id: None)
    vendor = {"id": "v1", "plan": "pro", "plan_expires_at": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()}
    db = FakeDB(vendor)
    monkeypatch.setattr(subs, "get_db", lambda: db)
    return vendor, db


def _sign(order_id, payment_id, secret=SECRET):
    return hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def _razorpay(monkeypatch, vendor_id="v1", amount=PRICE, status="captured"):
    async def fake_get(path):
        if path.startswith("/orders/"):
            return {"id": "order_1", "amount": PRICE, "notes": {"vendor_id": vendor_id, "plan": "pro"}}
        return {"id": "pay_1", "order_id": "order_1", "amount": amount, "status": status}
    monkeypatch.setattr(subs, "_rz_get", fake_get)


def _verify(vendor, signature=None):
    body = subs.CheckoutVerify(razorpay_order_id="order_1", razorpay_payment_id="pay_1",
                               razorpay_signature=signature or _sign("order_1", "pay_1"))
    return asyncio.run(subs.verify_checkout(body, vendor))


def test_paid_adds_30_days_on_top_of_days_left(shop, monkeypatch):
    vendor, db = shop
    _razorpay(monkeypatch)
    before = datetime.fromisoformat(vendor["plan_expires_at"])
    res = _verify(vendor)
    after = datetime.fromisoformat(db.rows["vendors"][0]["plan_expires_at"])
    assert res["ok"] and round((after - before).total_seconds() / 86400) == 30


def test_same_payment_never_counts_twice(shop, monkeypatch):
    vendor, db = shop
    _razorpay(monkeypatch)
    first = _verify(vendor)["plan_expires_at"]
    second = _verify(vendor)["plan_expires_at"]
    assert first == second and len(db.rows["payment_events"]) == 1


def test_locked_shop_gets_30_days_from_today(shop, monkeypatch):
    vendor, db = shop
    db.rows["vendors"][0]["plan_expires_at"] = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    _razorpay(monkeypatch)
    _verify(vendor)
    left = datetime.fromisoformat(db.rows["vendors"][0]["plan_expires_at"]) - datetime.now(timezone.utc)
    assert 29.9 < left.total_seconds() / 86400 <= 30


def test_wrong_signature_is_refused(shop, monkeypatch):
    vendor, db = shop
    _razorpay(monkeypatch)
    with pytest.raises(HTTPException) as e:
        _verify(vendor, signature=_sign("order_1", "pay_1", secret="someone_else"))
    assert e.value.status_code == 400 and not db.rows["payment_events"]


def test_payment_for_another_shop_or_wrong_amount_is_refused(shop, monkeypatch):
    vendor, db = shop
    _razorpay(monkeypatch, vendor_id="other_shop")
    with pytest.raises(HTTPException):
        _verify(vendor)
    _razorpay(monkeypatch, amount=100)
    with pytest.raises(HTTPException):
        _verify(vendor)
    assert not db.rows["payment_events"]


def test_payment_not_captured_is_refused(shop, monkeypatch):
    vendor, _ = shop
    _razorpay(monkeypatch, status="failed")
    with pytest.raises(HTTPException):
        _verify(vendor)


def test_webhook_refuses_everything_without_a_secret(monkeypatch):
    monkeypatch.setattr(settings, "razorpay_webhook_secret", "")
    with pytest.raises(HTTPException) as e:
        asyncio.run(subs.razorpay_webhook(None, x_razorpay_signature="anything"))
    assert e.value.status_code == 503


def test_razorpay_refusal_is_logged_and_explained(caplog):
    import httpx
    bad_keys = httpx.Response(401, json={"error": {"code": "BAD_REQUEST_ERROR", "description": "Authentication failed"}})
    with caplog.at_level("WARNING"), pytest.raises(HTTPException) as e:
        subs._rz_fail(bad_keys, "POST /orders")
    assert e.value.status_code == 503 and "not set up correctly" in e.value.detail
    assert "Authentication failed" in caplog.text and "rzp_" not in caplog.text.replace("mode=", "")
    down = httpx.Response(500, text="oops")
    with pytest.raises(HTTPException) as e:
        subs._rz_fail(down, "POST /orders")
    assert e.value.status_code == 502 and "{" not in e.value.detail
