"""One login per shop type: which account a sign-in opens."""
from fastapi import HTTPException

from app.routers.auth import _choose_account, _shop_type

KIRANA = {"id": "k", "shop_type": "kirana", "pw": "a"}
CHAI = {"id": "c", "shop_type": "chai", "pw": "b"}
BAD = HTTPException(status_code=401, detail="bad")


def pick(rows, shop, pw):
    return _choose_account(rows, shop, lambda r: r["pw"] == pw, BAD)


def test_shop_type_from_modules():
    assert _shop_type(["chai"]) == "chai"
    assert _shop_type("bangle_fancy") == "bangle_fancy"
    assert _shop_type(["x"]) is None and _shop_type(None) is None


def test_page_shop_wins():
    both = [KIRANA, {**CHAI, "pw": "a"}]
    assert pick(both, "chai", "a")["id"] == "c"
    assert pick(both, "kirana", "a")["id"] == "k"


def test_password_decides_between_accounts():
    assert pick([KIRANA, CHAI], None, "b")["id"] == "c"
    # Chai page but the password only opens the kirana account → kirana (app offers to create chai)
    assert pick([KIRANA, CHAI], "chai", "a")["id"] == "k"


def test_two_accounts_same_password_asks():
    try:
        pick([KIRANA, {**CHAI, "pw": "a"}], None, "a")
        raise AssertionError("expected 409")
    except HTTPException as e:
        assert e.status_code == 409 and set(e.detail["choose_shop"]) == {"kirana", "chai"}


def test_wrong_password():
    try:
        pick([KIRANA], "kirana", "zzz")
        raise AssertionError("expected 401")
    except HTTPException as e:
        assert e.status_code == 401
