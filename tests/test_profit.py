"""bill_profit: profit from bills' own items (cancelled bills and GST excluded)."""
from app.core.profit import bill_profit


class _Query:
    def __init__(self, rows): self.rows = rows
    def select(self, *_): return self
    def in_(self, _col, ids): self.rows = [r for r in self.rows if r["id"] in ids]; return self
    def eq(self, *_): return self
    def execute(self): return type("R", (), {"data": self.rows})()


class _DB:
    def __init__(self, products): self.products = products
    def table(self, _name): return _Query(list(self.products))


PRODUCTS = [
    {"id": "salt", "cost_price": 24},   # sells at 28
    {"id": "oil",  "cost_price": 148},  # sells at 165
    {"id": "loss", "cost_price": 60},   # sells at 50 — a real loss
    {"id": "nocost", "cost_price": 0},  # cost unknown
]

def item(pid, qty, price):
    return {"product_id": pid, "qty": qty, "unit_price": price, "subtotal": qty * price}


def test_cancelled_bill_and_gst_do_not_create_a_loss():
    bills = [
        {"status": "paid", "total": 205.8, "items": [item("salt", 2, 28), item("oil", 1, 165)]},  # 221 ex-GST… total incl GST
        {"status": "cancelled", "total": 1650, "items": [item("oil", 10, 165)]},                   # must be ignored
    ]
    r = bill_profit(_DB(PRODUCTS), "v1", bills)
    # (56 - 48) + (165 - 148) = 25 on 221 of costed sales
    assert r["profit"] == 25
    assert r["margin_pct"] == round(25 / 221 * 100, 1)
    assert r["bills"] == 1 and r["revenue"] == 205.8


def test_items_without_cost_are_left_out_not_counted_as_free():
    r = bill_profit(_DB(PRODUCTS), "v1", [{"status": "paid", "total": 128, "items": [item("salt", 1, 28), item("nocost", 1, 100)]}])
    assert r["profit"] == 4 and r["cost_coverage"] == 0.5


def test_real_loss_still_shows():
    r = bill_profit(_DB(PRODUCTS), "v1", [{"status": "paid", "total": 50, "items": [item("loss", 1, 50)]}])
    assert r["profit"] == -10


def test_no_cost_prices_gives_none():
    r = bill_profit(_DB(PRODUCTS), "v1", [{"status": "paid", "total": 100, "items": [item("nocost", 1, 100)]}])
    assert r["profit"] is None and r["margin_pct"] is None


def test_loss_items_name_the_culprits():
    bills = [{"status": "paid", "total": 1500, "items": [
        {**item("loss", 2, 50), "name": "Besan 500g"}, {**item("salt", 1, 28), "name": "Tata Salt"}]}]
    r = bill_profit(_DB(PRODUCTS), "v1", bills)
    assert r["loss_items"] == [{"name": "Besan 500g", "cost_price": 60, "sold_at": 50, "qty": 2, "loss": -20}]
