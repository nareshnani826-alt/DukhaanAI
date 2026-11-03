"""Everyday grocery words in the app's 10 languages → English words used in product names.

Lets the free chat answers match "gudlu" / "గుడ్లు" / "anda" to a product named "Eggs".
Each entry: English product words  →  local words (romanised and in their own script).
"""

GROCERY_WORDS: dict[tuple[str, ...], list[str]] = {
    ("egg", "eggs"): [
        "gudlu", "guddu", "anda", "ande", "andey", "muttai", "motte", "mutta", "dim", "ainda", "inda",
        "గుడ్లు", "గుడ్డు", "अंडा", "अंडे", "முட்டை", "ಮೊಟ್ಟೆ", "മുട്ട", "অণ্ডা", "ডিম", "ઈંડા", "ਅੰਡੇ", "ਆਂਡਾ"],
    ("milk",): [
        "paalu", "palu", "doodh", "dudh", "paal", "haalu", "dudha",
        "పాలు", "दूध", "பால்", "ಹಾಲು", "പാൽ", "দুধ", "દૂધ", "ਦੁੱਧ"],
    ("rice",): [
        "biyyam", "chawal", "chaval", "arisi", "akki", "ari", "chokha", "chaul", "tandul",   # not "chal" — Hindi "let's go"
        "బియ్యం", "चावल", "அரிசி", "ಅಕ್ಕಿ", "അരി", "চাল", "ચોખા", "ਚੌਲ", "तांदूळ"],
    ("sugar",): [
        "chakkera", "cheeni", "chini", "sakkarai", "sakkare", "panchasara", "khand", "sakhar",
        "చక్కెర", "चीनी", "சர்க்கரை", "ಸಕ್ಕರೆ", "പഞ്ചസാര", "চিনি", "ખાંડ", "ਖੰਡ", "साखर"],
    ("salt",): [
        "uppu", "namak", "lobon", "mithu", "meeth",
        "ఉప్పు", "नमक", "உப்பு", "ಉಪ್ಪು", "ഉപ്പ്", "লবণ", "મીઠું", "ਨਮਕ", "मीठ"],
    ("oil",): [
        "nune", "tel", "ennai", "enne", "tael",   # not "enna" — Tamil for "what"
        "నూనె", "तेल", "எண்ணெய்", "ಎಣ್ಣೆ", "എണ്ണ", "তেল", "તેલ", "ਤੇਲ"],
    ("dal",): [
        "pappu", "daal", "paruppu", "bele", "parippu", "dali",
        "పప్పు", "दाल", "பருப்பு", "ಬೇಳೆ", "പരിപ്പ്", "ডাল", "દાળ", "ਦਾਲ", "डाळ"],
    ("atta", "flour", "wheat"): [
        "pindi", "aata", "maavu", "hittu", "podi", "gehu", "kanik",
        "పిండి", "आटा", "மாவு", "ಹಿಟ್ಟು", "ആട്ട", "আটা", "લોટ", "ਆਟਾ", "पीठ"],
    ("curd", "dahi", "yogurt"): [
        "perugu", "thayir", "mosaru", "thairu", "doi", "dahin",
        "పెరుగు", "दही", "தயிர்", "ಮೊಸರು", "തൈര്", "দই", "દહીં", "ਦਹੀਂ"],
    ("ghee",): [
        "neyyi", "nei", "thuppa", "neyy", "ghi", "tup",
        "నెయ్యి", "घी", "நெய்", "ತುಪ್ಪ", "നെയ്യ്", "ঘি", "ઘી", "ਘਿਓ", "तूप"],
    ("butter",): [
        "venna", "makhan", "makkhan", "vennai", "benne", "makhon",
        "వెన్న", "मक्खन", "வெண்ணெய்", "ಬೆಣ್ಣೆ", "വെണ്ണ", "মাখন", "માખણ", "ਮੱਖਣ"],
    ("onion",): [
        "ullipaya", "ullipayalu", "pyaz", "pyaaz", "vengayam", "eerulli", "ulli", "peyaj", "dungli", "kanda",
        "ఉల్లిపాయ", "ఉల్లిపాయలు", "प्याज", "வெங்காயம்", "ಈರುಳ್ಳಿ", "ഉള്ളി", "পেঁয়াজ", "ડુંગળી", "ਪਿਆਜ਼", "कांदा"],
    ("potato", "potatoes"): [
        "bangaladumpa", "aloo", "alu", "urulaikizhangu", "alugadde", "urulakizhangu", "bataka", "batata",
        "బంగాళాదుంప", "आलू", "உருளைக்கிழங்கு", "ಆಲೂಗಡ್ಡೆ", "ഉരുളക്കിഴങ്ങ്", "আলু", "બટાકા", "ਆਲੂ", "बटाटा"],
    ("tomato", "tomatoes"): [
        "tamata", "tamatar", "thakkali", "tometo", "tameta",
        "టమాట", "టమాటా", "टमाटर", "தக்காளி", "ಟೊಮೇಟೊ", "തക്കാളി", "টমেটো", "ટમેટા", "ਟਮਾਟਰ"],
    ("tea",): [
        "chai", "chaha", "theeyilai", "teepodi",
        "టీ", "चाय", "தேநீர்", "டீ", "ಚಹಾ", "ചായ", "চা", "ચા", "ਚਾਹ", "चहा"],
    ("soap",): [
        "sabbu", "sabun", "sopu", "sopp", "saban",
        "సబ్బు", "साबुन", "சோப்பு", "ಸೋಪು", "സോപ്പ്", "সাবান", "સાબુ", "ਸਾਬਣ"],
    ("bread",): [
        "roti", "pav", "paav", "rotti",
        "బ్రెడ్", "ब्रेड", "ரொட்டி", "ಬ್ರೆಡ್", "ബ്രെഡ്", "পাউরুটি", "બ્રેડ", "ਬ੍ਰੈੱਡ"],
}

# Flattened lookup: local word → English words
LOCAL_TO_ENGLISH: dict[str, tuple[str, ...]] = {
    local: english for english, locals_ in GROCERY_WORDS.items() for local in locals_
}
