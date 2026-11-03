"""Local grocery words → English words used in product names, for the chat's free answers.

Lets "gudlu" / "గుడ్లు" / "anda" match a product named "Eggs". The words themselves live in
app/core/grocery_dictionary.py (shared with voice billing); this builds the lookup.
"""
from app.core.grocery_dictionary import ITEMS

# Local word → English words that may appear in product names
LOCAL_TO_ENGLISH: dict[str, tuple[str, ...]] = {}
for _item in ITEMS:
    _english = tuple(dict.fromkeys([*_item["en"], *_item["std"].split()]))
    for _word in _item["words"]:
        LOCAL_TO_ENGLISH[_word.lower()] = _english
