from app.routers.chai import _ist_bound, _materials_used, _total


def test_total_and_materials_used():
    menu = [{"id": "tea", "recipe": [["milk", 0.08], ["cups", 1]]}, {"id": "samosa", "recipe": []}]
    items = [{"menu_id": "tea", "name": "Tea", "price": 12, "qty": 3},
             {"menu_id": "samosa", "name": "Samosa", "price": 15, "qty": 1}]
    assert _total(items) == 51
    assert _materials_used(items, menu) == {"milk": 0.24, "cups": 3}


def test_unknown_menu_item_uses_nothing():
    assert _materials_used([{"menu_id": "gone", "name": "Old", "price": 5, "qty": 2}], []) == {}


def test_shop_day_bounds_are_ist():
    assert _ist_bound("2026-11-03") == "2026-11-02T18:30:00.000000Z"
    assert _ist_bound("2026-11-03", end=True) == "2026-11-03T18:29:59.999999Z"
