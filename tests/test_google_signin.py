"""Sign in with Google: only tokens Google signed for our client ID; first time → set up the shop."""
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jose import jwk, jwt

from app.core.config import settings
from app.routers import auth

CLIENT_ID = "123-test.apps.googleusercontent.com"
_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PEM = _key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
_PUB = jwk.construct(_key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo),
                     "RS256").to_dict()
_PUB.update(kid="k1", use="sig", alg="RS256")
_PUB = {k: (v.decode() if isinstance(v, bytes) else v) for k, v in _PUB.items()}


def _token(**over):
    claims = {"iss": "https://accounts.google.com", "aud": CLIENT_ID, "sub": "g-1", "email": "Owner@Gmail.com",
              "email_verified": True, "name": "Ravi", "iat": int(time.time()), "exp": int(time.time()) + 600}
    claims.update(over)
    return jwt.encode(claims, _PEM, algorithm="RS256", headers={"kid": "k1"})


@pytest.fixture(autouse=True)
def google(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(auth, "_google_certs", lambda refresh=False: {"keys": [_PUB]})


def test_genuine_token_is_accepted():
    assert auth._verify_google(_token())["email"] == "Owner@Gmail.com"


@pytest.mark.parametrize("bad", [
    {"aud": "someone-elses-app.apps.googleusercontent.com"},   # made for another app
    {"iss": "https://evil.example.com"},                        # not issued by Google
    {"exp": int(time.time()) - 60},                             # expired
])
def test_wrong_tokens_are_refused(bad):
    with pytest.raises(HTTPException) as e:
        auth._verify_google(_token(**bad))
    assert e.value.status_code == 401


def test_unverified_email_is_refused():
    with pytest.raises(HTTPException):
        auth._verify_google(_token(email_verified=False))


def test_forged_signature_is_refused():
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = other.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    forged = jwt.encode({"iss": "accounts.google.com", "aud": CLIENT_ID, "email": "x@y.com", "email_verified": True,
                         "exp": int(time.time()) + 600}, pem, algorithm="RS256", headers={"kid": "k1"})
    with pytest.raises(HTTPException):
        auth._verify_google(forged)


def test_off_when_no_client_id(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    with pytest.raises(HTTPException) as e:
        auth._verify_google(_token())
    assert e.value.status_code == 503


# ── The endpoint: first time → set up the shop; then signs straight in ─────────────

class _Q:
    def __init__(self, db, table): self.db, self.table, self.f, self.op, self.data = db, table, [], "select", None
    def select(self, *_): return self
    def eq(self, k, v): self.f.append((k, v)); return self
    def insert(self, data): self.op, self.data = "insert", data; return self
    def execute(self):
        rows = self.db.rows.setdefault(self.table, [])
        if self.op == "insert":
            row = {"id": f"v{len(rows) + 1}", "is_active": True, **self.data}; rows.append(row)
            return type("R", (), {"data": [row]})()
        return type("R", (), {"data": [r for r in rows if all(r.get(k) == v for k, v in self.f)]})()


class _DB:
    def __init__(self): self.rows = {}
    def table(self, name): return _Q(self, name)


@pytest.fixture
def db(monkeypatch):
    d = _DB()
    monkeypatch.setattr(auth, "get_db", lambda: d)
    monkeypatch.setattr(auth, "_issue_tokens", lambda _db, v: {"signed_in": v["id"], "shop_type": v["shop_type"]})
    return d


def _call(**body):
    return auth.google_sign_in.__wrapped__(None, auth.GoogleSignIn(id_token=_token(), **body))


def test_first_time_asks_to_set_up_the_shop(db):
    r = _call(shop_type="restaurant")
    assert r["status"] == "needs_signup" and r["email"] == "owner@gmail.com" and r["name"] == "Ravi"
    assert not db.rows.get("vendors")


def test_set_up_creates_a_trial_shop_then_signs_in(db):
    r = _call(shop_type="restaurant", create=True, store_name="Dragon Wok", phone="+91 98111 72634")
    shop = db.rows["vendors"][0]
    assert r["signed_in"] == shop["id"]
    assert shop["email"] == "owner@gmail.com" and shop["phone"] == "9811172634" and shop["plan"] == "pro"
    assert shop["plan_expires_at"] and shop["shop_type"] == "restaurant"
    # Next time: straight in, no new shop
    assert _call(shop_type="restaurant")["signed_in"] == shop["id"]
    assert len(db.rows["vendors"]) == 1


def test_create_account_for_a_new_shop_type_asks_to_set_it_up(db):
    _call(shop_type="kirana", create=True, store_name="Aparna", phone="9811172634")
    # Sign up with Google for a restaurant: this email only runs a kirana → set up the restaurant
    assert _call(shop_type="restaurant", signup=True)["status"] == "needs_signup"
    # Sign up again for the kirana it already has → just sign in to it
    assert _call(shop_type="kirana", signup=True)["signed_in"] == db.rows["vendors"][0]["id"]
    # Sign In (not sign up) with Google on the restaurant page → opens the shop it has
    assert _call(shop_type="restaurant")["signed_in"] == db.rows["vendors"][0]["id"]


def test_set_up_needs_a_store_name_and_valid_phone(db):
    with pytest.raises(HTTPException):
        _call(shop_type="chai", create=True, store_name="  ")
    with pytest.raises(HTTPException):
        _call(shop_type="chai", create=True, store_name="Chai Point", phone="12345")
    assert not db.rows.get("vendors")
