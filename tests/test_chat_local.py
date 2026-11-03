"""Free (no-AI) chat answers: product questions and multi-language keywords."""
import app.routers.chat as chat


class _Q:
    def __init__(self, rows): self.rows = rows
    def select(self, *_): return self
    def eq(self, *_): return self
    def execute(self): return type("R", (), {"data": self.rows})()


PRODUCTS = [
    {"name": "Amul Milk 500ml", "stock": 67, "unit": "litre", "mrp": 28, "min_stock": 5},
    {"name": "Amul Butter 100g", "stock": 3, "unit": "piece", "mrp": 58, "min_stock": 5},
    {"name": "Maggi Noodles 70g", "stock": 0, "unit": "piece", "mrp": 14, "min_stock": 5},
    {"name": "Toor Dal", "stock": 25.5, "unit": "kg", "mrp": 160, "min_stock": 5},
    {"name": "Tata Salt 1kg", "stock": 40, "unit": "piece", "mrp": 28, "min_stock": 5},
]
chat.get_db = lambda: type("DB", (), {"table": lambda self, _n: _Q(PRODUCTS)})()
ask = lambda m: chat._product_answer(m, "v1")


def test_product_stock_english():
    r = ask("Amul milk stock?")
    assert "Amul Milk 500ml" in r and "67 L in stock" in r and "Butter" not in r

def test_brand_lists_all_its_products():
    r = ask("amul stock")
    assert "Amul Milk" in r and "Amul Butter" in r and "running low" in r

def test_hindi_price_and_misspelling():
    r = ask("maggie kitne ka hai")
    assert "Maggi Noodles 70g" in r and "₹14" in r and "in stock" not in r

def test_out_of_stock_flag_and_loose_qty():
    assert "out of stock" in ask("maggi stock")
    assert "25.5 kg in stock" in ask("toor dal kitna bacha")

def test_telugu_and_tamil_scripts():
    assert "Tata Salt" in ask("tata salt ఎన్ని")
    assert "₹160" in ask("dal விலை")

def test_non_product_questions_fall_through():
    assert ask("aaj ka profit") is None          # no stock/price word
    assert ask("low stock items") is None        # no product named
    assert ask("udhar baki kitna") is None


def test_new_language_keywords_reach_free_answers():
    for msg, intent in [("இன்று விற்பனை எவ்வளவு", "sales_today"), ("ಈ ತಿಂಗಳು ಮಾರಾಟ", "monthly_sales"),
                        ("নফা", None), ("লাভ কত", "profit"), ("उधार किसका है", "udhar"),
                        ("స్టాక్ తక్కువ", "low_stock"), ("aajchi vikri", "sales_today")]:
        found, _ = chat._detect_intent(msg)
        assert (found and found["id"]) == intent, (msg, found and found["id"])


def test_bare_product_name_gets_stock_and_price():
    r = ask("amul milk")
    assert "Amul Milk 500ml" in r and "67 L in stock" in r and "₹28" in r and "Butter" not in r
    assert "Maggi" in ask("Maggi")
    assert ask("hello") is None
    assert ask("aaj ka profit") is None
    assert ask("is amul good for my kids") is None


def test_local_grocery_words_find_english_products():
    chat_products = PRODUCTS + [{"name": "Eggs", "stock": 30, "unit": "piece", "mrp": 8, "min_stock": 5}]
    chat.get_db = lambda: type("DB", (), {"table": lambda self, _n: _Q(chat_products)})()
    try:
        for msg in ["gudlu", "గుడ్లు", "anda kitne ka", "muttai stock", "ಮೊಟ್ಟೆ ಬೆಲೆ", "dim koto"]:
            r = ask(msg)
            assert r and "Eggs" in r, (msg, r)
        assert "Amul Milk" in ask("paalu")
        assert "Tata Salt" in ask("uppu ఎన్ని")
        assert ask("enna stock iruku") is None     # "enna" = "what" in Tamil, not oil
    finally:
        chat.get_db = lambda: type("DB", (), {"table": lambda self, _n: _Q(PRODUCTS)})()


def test_besan_local_names():
    items = PRODUCTS + [{"name": "Besan 500g", "stock": 20, "unit": "piece", "mrp": 55, "min_stock": 5},
                        {"name": "Parle G Biscuit", "stock": 50, "unit": "piece", "mrp": 10, "min_stock": 5}]
    chat.get_db = lambda: type("DB", (), {"table": lambda self, _n: _Q(items)})()
    try:
        for msg in ["sengapindi", "chengapindi stock", "senaga pindi price", "శనగ పిండి ఎన్ని"]:
            r = ask(msg)
            assert r and "Besan" in r and "Parle" not in r, (msg, r)
    finally:
        chat.get_db = lambda: type("DB", (), {"table": lambda self, _n: _Q(PRODUCTS)})()
