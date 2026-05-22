"""
Shelf-life intelligence database for Kirana store products.
Returns (min_days, max_days) based on product name patterns + category fallbacks.
All values represent days at typical Indian ambient/room temperature conditions.
"""

import re
from typing import Optional, Tuple

# ── Product name pattern rules (checked in order, first match wins) ──
# Each entry: (regex_pattern, min_days, max_days, label)
PRODUCT_RULES: list[tuple[str, int, int, str]] = [
    # ── Fresh milk / curd / paneer ────────────────────────────
    (r"\b(raw\s+milk|fresh\s+milk|toned\s+milk|full\s+cream\s+milk)\b", 1, 2, "Fresh Milk"),
    (r"\b(milk|doodh)\b",          2, 3,   "Milk"),
    (r"\b(curd|dahi|yogurt|yoghurt)\b", 2, 4, "Curd/Dahi"),
    (r"\b(paneer|cottage\s+cheese)\b",  3, 5, "Paneer"),
    (r"\b(butter|makhan)\b",            15, 30, "Butter"),
    (r"\b(ghee)\b",                     180, 365, "Ghee"),
    (r"\b(cream)\b",                    5, 7,  "Cream"),
    (r"\b(cheese)\b",                   14, 30, "Cheese"),

    # ── Eggs ──────────────────────────────────────────────────
    (r"\b(egg|anda)\b",                 14, 21, "Eggs"),

    # ── Bread / bakery ────────────────────────────────────────
    (r"\b(bread|pav|bun)\b",           3, 5,  "Bread/Pav"),
    (r"\b(rusk|toast)\b",              60, 90, "Rusk/Toast"),
    (r"\b(cake|pastry|muffin)\b",      3, 7,  "Cake/Pastry"),
    (r"\b(biscuit|cookie|cracker)\b",  60, 120, "Biscuits"),
    (r"\b(namkeen|chips|wafer|bhujia|murukku|mixture)\b", 30, 90, "Namkeen/Chips"),

    # ── Fruits & Vegetables ────────────────────────────────────
    (r"\b(tomato|tamatar)\b",          4, 7,  "Tomato"),
    (r"\b(onion|pyaaz|kanda)\b",       20, 30, "Onion"),
    (r"\b(potato|aloo|batata)\b",      20, 30, "Potato"),
    (r"\b(green\s+chilli|chilli|mirchi)\b", 5, 10, "Chilli"),
    (r"\b(lemon|nimbu)\b",             10, 14, "Lemon"),
    (r"\b(ginger|adrak)\b",            10, 15, "Ginger"),
    (r"\b(garlic|lahsun)\b",           14, 21, "Garlic"),
    (r"\b(banana|kela)\b",             3, 6,  "Banana"),
    (r"\b(apple|seb)\b",               14, 21, "Apple"),
    (r"\b(mango|aam)\b",               4, 7,  "Mango"),
    (r"\b(cucumber|kheera)\b",         5, 7,  "Cucumber"),
    (r"\b(capsicum|shimla)\b",         5, 7,  "Capsicum"),
    (r"\b(coriander|dhania|pudina|mint)\b", 3, 5, "Herbs"),
    (r"\b(spinach|palak|methi|fenugreek)\b", 2, 4, "Leafy Greens"),
    (r"\b(coconut|nariyal)\b",         20, 30, "Coconut"),

    # ── Meat / Fish (uncommon in kirana but included) ─────────
    (r"\b(chicken|murgi|mutton|lamb|beef|pork)\b", 1, 2, "Meat"),
    (r"\b(fish|machali|prawn|shrimp)\b", 1, 2, "Fish/Seafood"),

    # ── Packaged juices / drinks ──────────────────────────────
    (r"\b(fresh\s+juice|sugarcane)\b", 1, 1, "Fresh Juice"),
    (r"\b(juice|nectar|squash)\b",     90, 180, "Packaged Juice"),
    (r"\b(cold\s+drink|soda|cola|pepsi|coke|sprite|limca|thums)\b", 180, 365, "Aerated Drink"),
    (r"\b(energy\s+drink|red\s+bull|monster)\b", 180, 365, "Energy Drink"),
    (r"\b(water|packaged\s+water|mineral\s+water)\b", 365, 730, "Packaged Water"),
    (r"\b(lassi|buttermilk|chaas)\b",  1, 2, "Lassi/Chaas"),
    (r"\b(tender\s+coconut|coconut\s+water)\b", 1, 3, "Coconut Water"),

    # ── Tea / Coffee ──────────────────────────────────────────
    (r"\b(tea|chai|green\s+tea|chai\s+patti)\b", 365, 730, "Tea"),
    (r"\b(coffee|nescafe|bru)\b",      365, 730, "Coffee"),

    # ── Oils & Fats ───────────────────────────────────────────
    (r"\b(mustard\s+oil|sarso\s+ka\s+tel|sarson)\b", 180, 365, "Mustard Oil"),
    (r"\b(groundnut\s+oil|peanut\s+oil|moongphali)\b", 180, 365, "Groundnut Oil"),
    (r"\b(sunflower\s+oil|soya\s+oil|refined\s+oil)\b", 180, 365, "Refined Oil"),
    (r"\b(olive\s+oil)\b",             365, 730, "Olive Oil"),
    (r"\b(coconut\s+oil)\b",           365, 730, "Coconut Oil"),
    (r"\b(vanaspati|dalda)\b",         180, 365, "Vanaspati"),

    # ── Rice & Grains ─────────────────────────────────────────
    (r"\b(basmati)\b",                 365, 730, "Basmati Rice"),
    (r"\b(rice|chawal|chaawal)\b",     365, 730, "Rice"),
    (r"\b(wheat|gehun|atta|maida|sooji|rawa|semolina)\b", 180, 365, "Wheat/Flour"),
    (r"\b(oats|oatmeal)\b",            365, 730, "Oats"),
    (r"\b(corn\s+flour|cornflour|makki)\b", 180, 365, "Corn Flour"),
    (r"\b(poha|flattened\s+rice|beaten\s+rice)\b", 90, 180, "Poha"),
    (r"\b(millet|bajra|jowar|ragi|nachni)\b", 180, 365, "Millets"),

    # ── Pulses / Dal ──────────────────────────────────────────
    (r"\b(toor\s+dal|arhar|tuvar)\b",  365, 730, "Toor Dal"),
    (r"\b(moong\s+dal|mung|green\s+gram)\b", 365, 730, "Moong Dal"),
    (r"\b(chana\s+dal|gram)\b",        365, 730, "Chana Dal"),
    (r"\b(masoor\s+dal|red\s+lentil)\b", 365, 730, "Masoor Dal"),
    (r"\b(urad\s+dal|black\s+gram)\b", 365, 730, "Urad Dal"),
    (r"\b(dal|dhal|lentil|pulse)\b",   365, 730, "Dal/Pulses"),
    (r"\b(rajma|kidney\s+bean)\b",     365, 730, "Rajma"),
    (r"\b(chhole|chickpea|kabuli)\b",  365, 730, "Chhole"),
    (r"\b(moth|matki)\b",              365, 730, "Moth Beans"),

    # ── Spices & Masalas ──────────────────────────────────────
    (r"\b(whole\s+spice|sabut)\b",     365, 730, "Whole Spice"),
    (r"\b(masala\s+powder|curry\s+powder|spice\s+mix)\b", 365, 730, "Masala Mix"),
    (r"\b(haldi|turmeric)\b",          365, 730, "Turmeric"),
    (r"\b(jeera|cumin)\b",             365, 730, "Cumin"),
    (r"\b(dhania|coriander\s+powder)\b", 365, 730, "Coriander Powder"),
    (r"\b(red\s+chilli\s+powder|lal\s+mirch)\b", 365, 730, "Red Chilli Powder"),
    (r"\b(garam\s+masala)\b",          365, 730, "Garam Masala"),
    (r"\b(pepper|kali\s+mirch)\b",     365, 730, "Black Pepper"),
    (r"\b(elaichi|cardamom)\b",        365, 730, "Cardamom"),
    (r"\b(clove|laung)\b",             365, 730, "Cloves"),
    (r"\b(cinnamon|dalchini)\b",       365, 730, "Cinnamon"),
    (r"\b(hing|asafoetida)\b",         365, 730, "Hing"),
    (r"\b(ajwain|carom)\b",            365, 730, "Ajwain"),
    (r"\b(saunf|fennel)\b",            365, 730, "Fennel"),

    # ── Sugar / Salt / Sweeteners ─────────────────────────────
    (r"\b(sugar|chini|shakkar|jaggery|gud|gur)\b", 365, 730, "Sugar/Jaggery"),
    (r"\b(salt|namak|iodised\s+salt)\b", 1825, 3650, "Salt"),
    (r"\b(honey|shahad)\b",            730, 1825, "Honey"),

    # ── Sauces / Pickles / Condiments ────────────────────────
    (r"\b(ketchup|tomato\s+sauce|chilli\s+sauce)\b", 180, 365, "Ketchup/Sauce"),
    (r"\b(pickle|achar|achaar)\b",     180, 365, "Pickle"),
    (r"\b(jam|marmalade|jelly)\b",     180, 365, "Jam/Jelly"),
    (r"\b(vinegar)\b",                 730, 1825, "Vinegar"),
    (r"\b(soy\s+sauce|soya\s+sauce)\b", 365, 730, "Soy Sauce"),
    (r"\b(mayonnaise|mayo)\b",         90, 180, "Mayonnaise"),
    (r"\b(tamarind|imli)\b",           90, 180, "Tamarind"),

    # ── Instant foods ─────────────────────────────────────────
    (r"\b(maggi|instant\s+noodle|noodle|ramen)\b", 180, 365, "Instant Noodles"),
    (r"\b(vermicelli|seviyan|sewai)\b", 180, 365, "Vermicelli"),
    (r"\b(pasta|macaroni|spaghetti)\b", 180, 365, "Pasta"),
    (r"\b(ready\s+to\s+eat|rte|ready\s+meal|packaged\s+food)\b", 90, 180, "Ready-to-Eat"),
    (r"\b(papad|pappad|pappadum)\b",   180, 365, "Papad"),
    (r"\b(khichdi|poha\s+mix|upma\s+mix)\b", 90, 180, "Instant Mix"),

    # ── Dry fruits & Nuts ────────────────────────────────────
    (r"\b(cashew|kaju)\b",             90, 180, "Cashew"),
    (r"\b(almond|badam)\b",            180, 365, "Almond"),
    (r"\b(peanut|moongphali|groundnut)\b", 90, 180, "Peanut"),
    (r"\b(walnut|akhrot)\b",           90, 180, "Walnut"),
    (r"\b(raisin|kishmish)\b",         90, 180, "Raisin"),
    (r"\b(dates|khajoor)\b",           90, 180, "Dates"),
    (r"\b(dry\s+fruit|dryfruit)\b",    90, 180, "Dry Fruits"),
    (r"\b(pistachio|pista)\b",         90, 180, "Pistachio"),

    # ── Baby care / Supplements ───────────────────────────────
    (r"\b(baby\s+food|infant|cerelac|nestle)\b", 180, 365, "Baby Food"),
    (r"\b(protein|whey|supplement|boost|horlicks|complan|bournvita|milo)\b", 180, 365, "Health Supplement"),

    # ── Personal care (non-food — very long shelf life) ───────
    (r"\b(soap|sabun|bodywash|shampoo|conditioner|hairwash)\b", 730, 1095, "Soap/Shampoo"),
    (r"\b(toothpaste|toothbrush|mouthwash)\b", 730, 1095, "Dental Care"),
    (r"\b(detergent|washing\s+powder|surf|ariel|tide|vim|harpic|phenyl)\b", 1095, 1825, "Detergent/Cleaner"),
    (r"\b(oil\s+for\s+hair|coconut\s+oil\s+hair|hair\s+oil|parachute)\b", 730, 1095, "Hair Oil"),
    (r"\b(lotion|cream|moisturizer|fairness|sunscreen|body\s+lotion)\b", 730, 1095, "Skin Care"),
    (r"\b(sanitary|pad|napkin|kotex|whisper|stayfree)\b", 1825, 3650, "Sanitary"),
    (r"\b(diaper|pampers|huggies)\b",  1825, 3650, "Diapers"),

    # ── Household / Agarbatti ────────────────────────────────
    (r"\b(agarbatti|incense|camphor|kapoor|pooja)\b", 730, 1825, "Agarbatti/Pooja"),
    (r"\b(candle|matchbox|match\s+stick|lighter)\b", 1825, 3650, "Candles/Match"),
    (r"\b(mosquito|repellent|goodnight|allout|mortein)\b", 730, 1095, "Mosquito Repellent"),

    # ── Cigarettes / Tobacco ─────────────────────────────────
    (r"\b(cigarette|bidi|tobacco|gutka|pan\s+masala)\b", 365, 730, "Tobacco"),

    # ── Generic packaged food fallback ────────────────────────
    (r"\b(packet|pack|pouch|box|bottle|can|tin|jar)\b", 90, 180, "Packaged Product"),
]

# ── Category fallbacks (when no name pattern matches) ──────────
CATEGORY_SHELF_LIFE: dict[str, tuple[int, int]] = {
    "dairy":          (3, 7),
    "fresh produce":  (3, 7),
    "vegetables":     (5, 10),
    "fruits":         (5, 10),
    "meat":           (1, 2),
    "seafood":        (1, 2),
    "bakery":         (3, 7),
    "beverages":      (180, 365),
    "juices":         (90, 180),
    "snacks":         (60, 120),
    "staples":        (180, 365),
    "rice":           (365, 730),
    "pulses":         (365, 730),
    "oils":           (180, 365),
    "spices":         (365, 730),
    "masala":         (365, 730),
    "condiments":     (180, 365),
    "instant food":   (90, 180),
    "dry fruits":     (90, 180),
    "personal care":  (730, 1095),
    "household":      (730, 1825),
    "cleaning":       (365, 1095),
    "baby care":      (180, 365),
    "health":         (180, 365),
    "tobacco":        (365, 730),
    "confectionery":  (90, 180),
    "sweet":          (30, 90),
}

# ── Default when nothing matches ──────────────────────────────
DEFAULT_SHELF_LIFE = (90, 180)


def get_shelf_life(name: str, category: str = "") -> tuple[int, int]:
    """Return (min_days, max_days) shelf life for a product."""
    name_lower = name.lower() if name else ""
    for pattern, mn, mx, _ in PRODUCT_RULES:
        if re.search(pattern, name_lower):
            return (mn, mx)

    cat_lower = (category or "").lower()
    for cat_key, days in CATEGORY_SHELF_LIFE.items():
        if cat_key in cat_lower or cat_lower in cat_key:
            return days

    return DEFAULT_SHELF_LIFE


def get_risk_level(
    purchase_date_days_ago: int,
    shelf_min: int,
    shelf_max: int,
) -> str:
    """
    Returns one of: "safe", "attention", "high_risk", "likely_expired"
    based on how far through its shelf life a product is.
    """
    if shelf_max <= 0:
        return "safe"
    progress = purchase_date_days_ago / shelf_max
    if purchase_date_days_ago > shelf_max:
        return "likely_expired"
    if progress >= 0.85:
        return "high_risk"
    if progress >= 0.60:
        return "attention"
    return "safe"


def get_shelf_life_label(name: str, category: str = "") -> str:
    """Return the human-readable label for a matched product rule."""
    name_lower = name.lower() if name else ""
    for pattern, _, _, label in PRODUCT_RULES:
        if re.search(pattern, name_lower):
            return label
    return category or "General Product"
