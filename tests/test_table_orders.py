"""QR orders for a table join that table's open bill — one table, one bill."""
import pytest

from app.routers import online_orders as oo


@pytest.mark.parametrize("label,key", [
    ("T1", "1"), ("t 1", "1"), ("Table 1", "1"), ("table-01", "1"), ("Table 1 · Online · Ravi", "1"),
    ("T12", "12"), ("Table 4A", "4a"),
    ("Token 5", None), ("Takeaway", None), ("Pickup · Online · Ravi", None), ("Ravi", None), (None, None),
])
def test_table_key(label, key):
    assert oo._table_key(label) == key


class _Q:
    def __init__(self, db, t): self.db, self.t, self.f, self.op, self.data = db, t, [], "select", None
    def select(self, *_): return self
    def eq(self, k, v): self.f.append((k, v)); return self
    def in_(self, k, vals): self.f.append((k, ("__in__", tuple(vals)))); return self
    def order(self, *_a, **_k): return self
    def limit(self, _): return self
    def update(self, d): self.op, self.data = "update", d; return self
    def insert(self, d): self.op, self.data = "insert", d; return self
    def execute(self):
        rows = self.db.rows.setdefault(self.t, [])
        if self.op == "insert":
            row = {"id": f"{self.t}-{len(rows) + 1}", **self.data}; rows.append(row)
            return type("R", (), {"data": [row]})()
        hit = [r for r in rows if all((r.get(k) in v[1]) if isinstance(v, tuple) and v[:1] == ("__in__",) else r.get(k) == v for k, v in self.f)]
        if self.op == "update":
            for r in hit: r.update(self.data)
        return type("R", (), {"data": [dict(r) for r in hit]})()


class _DB:
    def __init__(self): self.rows = {}
    def table(self, t): return _Q(self, t)


@pytest.fixture
def db(monkeypatch):
    d = _DB()
    monkeypatch.setattr(oo, "get_db", lambda: d)
    return d


VENDOR = {"id": "v1"}


def _online(db, oid, table, items, name="Naresh"):
    db.rows.setdefault("online_orders", []).append({
        "id": oid, "vendor_id": "v1", "status": "new", "shop_type": "chai", "table_label": table, "customer_name": name,
        "items": [{"id": mid, "name": n, "price": p, "qty": q} for mid, n, p, q in items]})


def _open_bills(db):
    return [r for r in db.rows.get("chai_orders", []) if r["status"] == "open"]


def test_second_order_from_same_table_joins_its_bill(db):
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    _online(db, "o2", "1", [("m1", "Chilli Chicken", 180, 1), ("m2", "Soft Drink", 40, 2)])
    oo.accept("o1", VENDOR)
    oo.accept("o2", VENDOR)
    bills = _open_bills(db)
    assert len(bills) == 1
    assert {i["name"]: i["qty"] for i in bills[0]["items"]} == {"Chilli Chicken": 2, "Soft Drink": 2}
    assert bills[0]["total"] == 440


def test_order_joins_a_table_the_staff_opened_as_t1(db):
    db.rows["chai_orders"] = [{"id": "c1", "vendor_id": "v1", "status": "open", "label": "T1", "order_no": 1,
                               "items": [{"menu_id": "m2", "name": "Soft Drink", "price": 40, "qty": 1}], "total": 40}]
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    oo.accept("o1", VENDOR)
    assert len(_open_bills(db)) == 1 and _open_bills(db)[0]["total"] == 220


def test_other_tables_and_pickups_stay_separate(db):
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    _online(db, "o2", "2", [("m1", "Chilli Chicken", 180, 1)])
    _online(db, "o3", None, [("m1", "Chilli Chicken", 180, 1)])
    _online(db, "o4", None, [("m1", "Chilli Chicken", 180, 1)])
    for o in ("o1", "o2", "o3", "o4"):
        oo.accept(o, VENDOR)
    assert len(_open_bills(db)) == 4


def test_rejecting_one_order_keeps_the_rest_of_the_table_bill(db):
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    _online(db, "o2", "1", [("m2", "Soft Drink", 40, 2)])
    oo.accept("o1", VENDOR)
    oo.accept("o2", VENDOR)
    oo.reject("o2", None, VENDOR)
    bills = _open_bills(db)
    assert len(bills) == 1 and bills[0]["items"] == [{"menu_id": "m1", "name": "Chilli Chicken", "price": 180, "qty": 1.0}]
    oo.reject("o1", None, VENDOR)
    assert _open_bills(db) == []


# ── A table with an unpaid bill belongs to the people sitting there ──────────────

from fastapi import HTTPException  # noqa: E402

NARESH, RAVI = "9811172634", "9922233344"


def _free(db, table, phone):
    oo._check_table_free(db, "v1", table, phone)


def test_free_table_takes_anyone(db):
    _free(db, "1", RAVI)


def test_same_customer_can_order_another_round(db):
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    db.rows["online_orders"][0]["customer_phone"] = NARESH
    _free(db, "1", NARESH)                       # first order still waiting
    oo.accept("o1", VENDOR)
    _free(db, "1", NARESH)                       # accepted, on the table bill


def test_someone_else_is_turned_away_until_paid(db):
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    db.rows["online_orders"][0]["customer_phone"] = NARESH
    with pytest.raises(HTTPException) as e:
        _free(db, "1", RAVI)                     # waiting order
    assert e.value.status_code == 409 and "Table 1" in e.value.detail
    oo.accept("o1", VENDOR)
    with pytest.raises(HTTPException):
        _free(db, "1", RAVI)                     # unpaid bill
    _free(db, "2", RAVI)                         # another table is fine
    db.rows["chai_orders"][0]["status"] = "paid"
    _free(db, "1", RAVI)                         # paid → free again


def test_table_opened_by_staff_takes_no_qr_orders(db):
    db.rows["chai_orders"] = [{"id": "c1", "vendor_id": "v1", "status": "open", "label": "T3", "items": [], "total": 0}]
    with pytest.raises(HTTPException):
        _free(db, "3", RAVI)
    db.rows["chai_orders"][0]["status"] = "cancelled"
    _free(db, "3", RAVI)


def test_rejected_customer_no_longer_holds_the_table(db):
    _online(db, "o1", "1", [("m1", "Chilli Chicken", 180, 1)])
    db.rows["online_orders"][0]["customer_phone"] = NARESH
    oo.reject("o1", None, VENDOR)
    _free(db, "1", RAVI)
