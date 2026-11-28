"""30-day free trial: after it ends the shop is locked — reads work, saving is refused."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.security import _check_lock, plan_expires, plan_locked


def _req(method: str, path: str) -> Request:
    return Request({"type": "http", "method": method, "path": path, "headers": [], "query_string": b""})


def _shop(days: float | None, plan: str = "pro") -> dict:
    exp = None if days is None else (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    return {"plan": plan, "plan_expires_at": exp}


def test_trial_running_or_no_end_date_is_not_locked():
    assert not plan_locked(_shop(12))
    assert not plan_locked(_shop(None))          # demo / admin shops never end


def test_trial_over_is_locked():
    assert plan_locked(_shop(-1))
    assert plan_locked(_shop(-1, plan="wholesale"))


def test_free_plan_is_never_locked():
    assert not plan_locked(_shop(-5, plan="free"))


def test_supabase_timestamp_formats_parse():
    assert plan_expires({"plan_expires_at": "2026-12-28T10:00:00Z"}).tzinfo is not None
    assert plan_expires({"plan_expires_at": "2026-12-28T10:00:00.123456+00:00"}).year == 2026
    assert plan_expires({"plan_expires_at": "2026-12-28T10:00:00"}).tzinfo is not None


def test_locked_shop_can_read_but_not_save():
    shop = _shop(-1)
    _check_lock(shop, _req("GET", "/chai/orders"))                 # see old bills
    _check_lock(shop, _req("POST", "/auth/logout"))                # sign out
    _check_lock(shop, _req("POST", "/subscriptions/create"))       # pay
    with pytest.raises(HTTPException) as e:
        _check_lock(shop, _req("POST", "/chai/orders/pay"))        # new bill
    assert e.value.status_code == 402
    with pytest.raises(HTTPException):
        _check_lock(shop, _req("POST", "/invoices"))


def test_shop_on_trial_can_save():
    _check_lock(_shop(3), _req("POST", "/invoices"))
