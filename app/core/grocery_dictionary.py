"""Master grocery dictionary: everyday kirana items in the app's 10 languages.

Single source of truth for local item names:
- the chat's free answers read it via app/core/grocery_words.py
- Speak (voice billing) gets a generated copy: run `python scripts/gen_grocery_js.py`
  to rewrite frontend/src/voice/groceryDictionary.js after editing this file

Each item:
  std   — the usual English name, as it appears in product names (voice looks this up)
  en    — single English words that can appear in product names (chat scores these)
  words — local names: Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati,
          Punjabi — romanised and in their own script. Romanised words match only as whole
          words, so avoid ones that are common words in another language.
"""

ITEMS: list[dict] = [
    # ── Grains & flours ─────────────────────────────────────────
    {"std": "rice", "en": ("rice", "chawal"), "words": [
        "chawal", "chaval", "biyyam", "arisi", "akki", "chokha", "chaul", "tandul",
        "चावल", "బియ్యం", "அரிசி", "ಅಕ್ಕಿ", "അരി", "तांदूळ", "চাল", "ચોખા", "ਚੌਲ"]},
    {"std": "basmati", "en": ("basmati", "rice"), "words": [
        "बासमती", "బాస్మతి", "பாஸ்மதி", "ಬಾಸ್ಮತಿ", "ബസ്മതി", "বাসমতি", "બાસમતી", "ਬਾਸਮਤੀ"]},
    {"std": "sona masoori", "en": ("sona", "masoori", "masuri", "rice"), "words": [
        "sona masuri", "sonamasuri", "sonamasoori", "సోనా మసూరి", "சோனா மசூரி", "ಸೋನಾ ಮಸೂರಿ"]},
    {"std": "poha", "en": ("poha", "aval", "atukulu", "flattened"), "words": [
        "pauwa", "pauva", "atukulu", "avalakki", "chira", "chura", "chuda",
        "पोहा", "అటుకులు", "அவல்", "ಅವಲಕ್ಕಿ", "അവൽ", "पोहे", "চিড়া", "પૌંઆ", "ਪੋਹਾ"]},
    {"std": "wheat", "en": ("wheat", "gehu"), "words": [
        "gehu", "gehun", "godhumalu", "godumai", "kothumai", "godhi", "gothambu", "gahu", "ghau", "kanak",
        "गेहूं", "గోధుమలు", "கோதுமை", "ಗೋಧಿ", "ഗോതമ്പ്", "गहू", "গম", "ઘઉં", "ਕਣਕ"]},
    {"std": "atta", "en": ("atta", "aata", "flour", "wheat", "chakki"), "words": [
        "aata", "godhuma pindi", "gehu ka atta", "kothumai maavu", "godhi hittu", "gothambu podi", "kanik",
        "आटा", "గోధుమ పిండి", "கோதுமை மாவு", "ಗೋಧಿ ಹಿಟ್ಟು", "ഗോതമ്പ് പൊടി", "कणीक", "আটা", "ઘઉંનો લોટ", "ਆਟਾ"]},
    {"std": "maida", "en": ("maida", "refined", "flour"), "words": [
        "मैदा", "మైదా", "மைதா", "ಮೈದಾ", "മൈദ", "ময়দা", "મેંદો", "ਮੈਦਾ"]},
    {"std": "rava", "en": ("rava", "rawa", "sooji", "suji", "semolina"), "words": [
        "ravva", "sooji", "suji", "bombay rava", "upma rava",
        "सूजी", "रवा", "రవ్వ", "ரவை", "ರವೆ", "റവ", "সুজি", "રવો", "ਸੂਜੀ"]},
    {"std": "besan", "en": ("besan", "gram", "flour"), "words": [
        "senaga pindi", "senagapindi", "sengapindi", "senga pindi", "chengapindi", "chenga pindi", "chenaga pindi",
        "shanaga pindi", "sanaga pindi", "sanagapindi", "beson", "beshon", "kadalai maavu", "kadalai mavu",
        "kadale hittu", "kadala podi", "chana no lot", "vesan", "gram flour", "chickpea flour", "chana atta",
        "బేసన్", "సెనగ పిండి", "శనగ పిండి", "సెనగపిండి", "శనగపిండి", "बेसन", "கடலை மாவு", "ಕಡಲೆ ಹಿಟ್ಟು",
        "കടലമാവ്", "বেসন", "ચણાનો લોટ", "ਵੇਸਣ"]},
    {"std": "rice flour", "en": ("rice", "flour"), "words": [
        "biyyam pindi", "biyyapu pindi", "arisi maavu", "akki hittu", "ari podi", "chawal ka atta",
        "బియ్యపు పిండి", "அரிசி மாவு", "ಅಕ್ಕಿ ಹಿಟ್ಟು", "അരിപ്പൊടി", "चावल का आटा"]},
    {"std": "ragi", "en": ("ragi", "nachni", "millet"), "words": [
        "nachni", "nachani", "mandua", "ragulu", "kezhvaragu", "keppai", "muthari",
        "रागी", "नाचणी", "రాగులు", "రాగి", "கேழ்வரகு", "ರಾಗಿ", "മുത്താറി"]},
    {"std": "jowar", "en": ("jowar", "jonna", "sorghum"), "words": [
        "jonnalu", "jonna", "cholam", "jola", "jowari", "juwar", "jawar",
        "ज्वार", "जोंधळा", "జొన్నలు", "சோளம்", "ಜೋಳ", "ജോവർ", "জোয়ার", "જુવાર", "ਜਵਾਰ"]},
    {"std": "bajra", "en": ("bajra", "millet"), "words": [
        "sajjalu", "sajja", "kambu", "sajje", "bajri",
        "बाजरा", "बाजरी", "సజ్జలు", "கம்பு", "ಸಜ್ಜೆ", "ബജ്റ", "বাজরা", "બાજરી", "ਬਾਜਰਾ"]},
    {"std": "sabudana", "en": ("sabudana", "sago"), "words": [
        "saggubiyyam", "saggu biyyam", "javvarisi", "sabakki", "chowari", "sagu", "sabu dana",
        "साबूदाना", "సగ్గుబియ్యం", "ஜவ்வரிசி", "ಸಬ್ಬಕ್ಕಿ", "ചൗവ്വരി", "साबुदाणा", "সাবুদানা", "સાબુદાણા", "ਸਾਬੂਦਾਣਾ"]},
    {"std": "vermicelli", "en": ("vermicelli", "semiya", "sevai", "seviyan"), "words": [
        "semiya", "semya", "sevai", "seviyan", "sevaiyan", "shavige",
        "सेवई", "సేమియా", "சேமியா", "ಶಾವಿಗೆ", "സേമിയ", "शेवया", "সেমাই", "ਸੇਵੀਆਂ"]},
    {"std": "oats", "en": ("oats",), "words": ["ओट्स", "ఓట్స్", "ஓட்ஸ்", "ಓಟ್ಸ್", "ഓട്സ്"]},

    # ── Dals & pulses ───────────────────────────────────────────
    {"std": "toor dal", "en": ("toor", "thoor", "tur", "tuvar", "arhar", "dal"), "words": [
        "kandi pappu", "kandipappu", "arhar", "arhar dal", "tuvar dal", "tuver dal", "tuvaram paruppu",
        "thuvaram paruppu", "togari bele", "thuvara parippu", "tur dal", "harad dal",
        "अरहर", "अरहर दाल", "तूर डाळ", "కంది పప్పు", "కందిపప్పు", "துவரம் பருப்பு", "ತೊಗರಿ ಬೇಳೆ",
        "തുവര പരിപ്പ്", "অড়হর ডাল", "તુવેર દાળ", "ਅਰਹਰ ਦਾਲ"]},
    {"std": "moong dal", "en": ("moong", "mung", "dal"), "words": [
        "pesara pappu", "pesarapappu", "pesalu", "pasi paruppu", "payatham paruppu", "hesaru bele",
        "cherupayar parippu", "mug dal", "moog dal", "mugachi dal",
        "मूंग दाल", "మూంగ్ దాల్", "పెసర పప్పు", "பாசிப் பருப்பு", "ಹೆಸರು ಬೇಳೆ", "ചെറുപയർ പരിപ്പ്",
        "मूग डाळ", "মুগ ডাল", "મગની દાળ", "ਮੂੰਗੀ ਦਾਲ"]},
    {"std": "chana dal", "en": ("chana", "dal"), "words": [
        "senaga pappu", "senagapappu", "kadalai paruppu", "kadale bele", "kadala parippu", "harbhara dal",
        "cholar dal", "chane ki dal",
        "चना दाल", "శనగ పప్పు", "సెనగ పప్పు", "கடலைப் பருப்பு", "ಕಡಲೆ ಬೇಳೆ", "കടല പരിപ്പ്",
        "हरभरा डाळ", "ছোলার ডাল", "ચણાની દાળ", "ਛੋਲਿਆਂ ਦੀ ਦਾਲ"]},
    {"std": "urad dal", "en": ("urad", "udad", "urid", "dal"), "words": [
        "minapa pappu", "minappappu", "minumulu", "ulundu", "ulutham paruppu", "uddina bele", "uzhunnu",
        "udid dal", "biulir dal", "maah di dal",
        "उड़द दाल", "मिनपप्पु", "మినప పప్పు", "మినుములు", "உளுந்து", "ಉದ್ದಿನ ಬೇಳೆ", "ഉഴുന്ന്",
        "उडीद डाळ", "বিউলির ডাল", "અડદ દાળ", "ਮਾਂਹ ਦੀ ਦਾਲ"]},
    {"std": "masoor dal", "en": ("masoor", "masur", "dal"), "words": [
        "masoor", "masur", "erra pappu", "errapappu", "mysore paruppu", "masoor bele", "chuvanna parippu",
        "musur dal",
        "मसूर दाल", "ఎర్ర పప్పు", "மசூர் பருப்பு", "ಮಸೂರ್ ಬೇಳೆ", "മസൂർ പരിപ്പ്", "मसूर डाळ",
        "মসুর ডাল", "મસૂર દાળ", "ਮਸਰ ਦੀ ਦਾਲ"]},
    {"std": "chana", "en": ("chana", "chickpea", "chickpeas", "chole", "kabuli"), "words": [
        "chole", "kabuli chana", "kala chana", "senagalu", "kondakadalai", "kadale kalu", "harbhara", "chhola",
        "छोले", "चना", "काबुली चना", "శనగలు", "கொண்டைக்கடலை", "ಕಡಲೆ ಕಾಳು", "കടല",
        "हरभरा", "ছোলা", "ચણા", "ਛੋਲੇ"]},
    {"std": "rajma", "en": ("rajma", "kidney", "beans"), "words": [
        "rajmah", "राजमा", "రాజ్మా", "ராஜ்மா", "ರಾಜ್ಮಾ", "രാജ്മ", "राजमा", "রাজমা", "રાજમા", "ਰਾਜਮਾਂਹ"]},
    {"std": "groundnut", "en": ("groundnut", "groundnuts", "peanut", "peanuts"), "words": [
        "moongphali", "mungfali", "mungphali", "verusenaga", "verushenaga", "palli", "pallilu", "verkadalai",
        "kadlekai", "nilakadala", "shengdana", "chinabadam", "singdana", "sing dana",
        "मूंगफली", "వేరుశెనగ", "పల్లీలు", "வேர்க்கடலை", "ಕಡಲೆಕಾಯಿ", "നിലക്കടല", "शेंगदाणे",
        "চীনাবাদাম", "સીંગદાણા", "ਮੂੰਗਫਲੀ"]},
    {"std": "soya", "en": ("soya", "soyabean", "chunks"), "words": [
        "soya badi", "soya bari", "meal maker", "सोया बड़ी", "సోయా", "மீல் மேக்கர்", "ಸೋಯಾ"]},

    # ── Spices & masalas ────────────────────────────────────────
    {"std": "turmeric", "en": ("turmeric", "haldi"), "words": [
        "haldi", "pasupu", "manjal", "manjal podi", "arishina", "arisina", "halad", "holud", "haldar",
        "हल्दी", "పసుపు", "மஞ்சள்", "ಅರಿಶಿನ", "മഞ്ഞൾ", "हळद", "হলুদ", "હળદર", "ਹਲਦੀ"]},
    {"std": "chilli powder", "en": ("chilli", "chili", "mirchi", "mirch", "red"), "words": [
        "lal mirch", "laal mirch", "mirchi powder", "karam podi", "kaaram", "milagai thool", "milagai podi",
        "menasina pudi", "mulaku podi", "tikhat", "lanka gura", "marchu",
        "लाल मिर्च", "కారం", "మిరపకాయ పొడి", "மிளகாய் தூள்", "ಮೆಣಸಿನ ಪುಡಿ", "മുളകുപൊടി", "तिखट",
        "লঙ্কা গুঁড়ো", "લાલ મરચું", "ਲਾਲ ਮਿਰਚ"]},
    {"std": "green chilli", "en": ("green", "chilli", "chili", "mirchi"), "words": [
        "hari mirch", "pachi mirchi", "pachimirchi", "pachai milagai", "hasi menasinakai", "pacha mulaku",
        "hirvi mirchi", "kacha lanka", "lila marcha", "hari mirchi",
        "हरी मिर्च", "పచ్చి మిర్చి", "பச்சை மிளகாய்", "ಹಸಿ ಮೆಣಸಿನಕಾಯಿ", "പച്ചമുളക്", "हिरवी मिरची",
        "কাঁচা লঙ্কা", "લીલા મરચાં", "ਹਰੀ ਮਿਰਚ"]},
    {"std": "coriander", "en": ("coriander", "dhaniya", "dhania"), "words": [
        "dhaniya", "dhania", "dhaniyalu", "dhaniya powder", "kothamalli", "kottambari", "dhane", "dhone",
        "धनिया", "ధనియాలు", "கொத்தமல்லி", "ಕೊತ್ತಂಬರಿ", "മല്ലി", "धणे", "ধনে", "ધાણા", "ਧਨੀਆ"]},
    {"std": "jeera", "en": ("jeera", "jira", "cumin", "zeera"), "words": [
        "jeera", "jira", "zeera", "jeelakarra", "jilakara", "seeragam", "jeerige", "jeerakam", "jire", "jeeru",
        "जीरा", "జీలకర్ర", "சீரகம்", "ಜೀರಿಗೆ", "ജീരകം", "जिरे", "জিরা", "જીરું", "ਜੀਰਾ"]},
    {"std": "mustard", "en": ("mustard", "rai", "sarson"), "words": [
        "rai", "sarson", "avalu", "aavalu", "kadugu", "sasive", "kaduku", "mohari", "sorshe",
        "राई", "सरसों", "ఆవాలు", "கடுகு", "ಸಾಸಿವೆ", "കടുക്", "मोहरी", "সর্ষে", "રાઈ", "ਸਰ੍ਹੋਂ"]},
    {"std": "pepper", "en": ("pepper", "black"), "words": [
        "kali mirch", "kaali mirch", "miriyalu", "milagu", "menasu", "kurumulaku", "miri", "gol morich",
        "काली मिर्च", "మిరియాలు", "மிளகு", "ಮೆಣಸು", "കുരുമുളക്", "मिरी", "গোলমরিচ", "મરી", "ਕਾਲੀ ਮਿਰਚ"]},
    {"std": "garam masala", "en": ("garam", "masala"), "words": [
        "गरम मसाला", "గరం మసాలా", "கரம் மசாலா", "ಗರಂ ಮಸಾಲ", "ഗരം മസാല", "গরম মশলা", "ગરમ મસાલો", "ਗਰਮ ਮਸਾਲਾ"]},
    {"std": "hing", "en": ("hing", "asafoetida"), "words": [
        "heeng", "inguva", "perungayam", "ingu", "kayam",
        "हींग", "ఇంగువ", "பெருங்காயம்", "ಇಂಗು", "കായം", "हिंग", "হিং", "હિંગ", "ਹਿੰਗ"]},
    {"std": "methi", "en": ("methi", "fenugreek"), "words": [
        "methi", "menthulu", "mentulu", "vendhayam", "menthya", "uluva", "methi dana",
        "मेथी", "మెంతులు", "வெந்தயம்", "ಮೆಂತ್ಯ", "ഉലുവ", "মেথি", "મેથી", "ਮੇਥੀ"]},
    {"std": "elaichi", "en": ("elaichi", "elachi", "cardamom"), "words": [
        "elaichi", "elachi", "ilaychi", "yalakulu", "elakkai", "elakki", "velchi", "elach",
        "इलायची", "యాలకులు", "ஏலக்காய்", "ಏಲಕ್ಕಿ", "ഏലം", "वेलची", "এলাচ", "એલચી", "ਇਲਾਇਚੀ"]},
    {"std": "laung", "en": ("laung", "lavang", "clove", "cloves"), "words": [
        "laung", "lavang", "lavangalu", "kirambu", "lavanga", "grampu",
        "लौंग", "లవంగాలు", "கிராம்பு", "ಲವಂಗ", "ഗ്രാമ്പൂ", "लवंग", "লবঙ্গ", "લવિંગ", "ਲੌਂਗ"]},
    {"std": "dalchini", "en": ("dalchini", "cinnamon"), "words": [
        "dalchini", "dalchina chekka", "pattai", "chakke", "karuvapatta",
        "दालचीनी", "దాల్చిన చెక్క", "பட்டை", "ಚಕ್ಕೆ", "കറുവപ്പട്ട", "দারচিনি", "તજ", "ਦਾਲਚੀਨੀ"]},
    {"std": "ajwain", "en": ("ajwain", "carom"), "words": [
        "ajwain", "ajwayan", "vaamu", "omam", "ayamodakam", "ova", "jowan", "ajmo",
        "अजवाइन", "వాము", "ஓமம்", "ಓಮ", "അയമോദകം", "ओवा", "জোয়ান", "અજમો", "ਅਜਵਾਇਣ"]},
    {"std": "tamarind", "en": ("tamarind", "imli"), "words": [
        "imli", "chintapandu", "chinta pandu", "hunase", "valanpuli", "chinch", "tentul", "aamli",
        "इमली", "చింతపండు", "புளி", "ಹುಣಸೆ", "പുളി", "चिंच", "তেঁতুল", "આમલી", "ਇਮਲੀ"]},
    {"std": "jaggery", "en": ("jaggery", "gur", "gud"), "words": [
        "gur", "gud", "bellam", "vellam", "bella", "sharkara", "gul",
        "गुड़", "బెల్లం", "வெல்லம்", "ಬೆಲ್ಲ", "ശർക്കര", "गूळ", "গুড়", "ગોળ", "ਗੁੜ"]},
    {"std": "til", "en": ("til", "sesame"), "words": [
        "til", "nuvvulu", "ellu", "tilachi",
        "तिल", "నువ్వులు", "எள்", "ಎಳ್ಳು", "എള്ള്", "तीळ", "তিল", "તલ", "ਤਿਲ"]},
    {"std": "sugar", "en": ("sugar", "cheeni"), "words": [
        "chakkera", "panchadara", "cheeni", "chini", "sakkarai", "sakkare", "panchasara", "khand", "sakhar",
        "చక్కెర", "పంచదార", "चीनी", "சர்க்கரை", "ಸಕ್ಕರೆ", "പഞ്ചസാര", "साखर", "চিনি", "ખાંડ", "ਖੰਡ"]},
    {"std": "salt", "en": ("salt", "namak"), "words": [
        "uppu", "namak", "lobon", "mithu", "meeth",
        "ఉప్పు", "नमक", "உப்பு", "ಉಪ್ಪು", "ഉപ്പ്", "मीठ", "লবণ", "મીઠું", "ਨਮਕ"]},

    # ── Oils ────────────────────────────────────────────────────
    {"std": "oil", "en": ("oil",), "words": [
        "nune", "tel", "ennai", "enne", "tael",          # not "enna" — Tamil for "what"
        "నూనె", "तेल", "எண்ணெய்", "ಎಣ್ಣೆ", "എണ്ണ", "তেল", "તેલ", "ਤੇਲ"]},
    {"std": "groundnut oil", "en": ("groundnut", "peanut", "oil"), "words": [
        "palli nune", "verusenaga nune", "kadalai ennai", "kadlekai enne", "shengdana tel", "mungfali tel", "singtel",
        "పల్లీ నూనె", "வேர்க்கடலை எண்ணெய்", "मूंगफली तेल"]},
    {"std": "mustard oil", "en": ("mustard", "oil"), "words": [
        "sarson ka tel", "sarso tel", "sorsher tel", "सरसों का तेल", "সর্ষের তেল", "ਸਰ੍ਹੋਂ ਦਾ ਤੇਲ"]},
    {"std": "coconut oil", "en": ("coconut", "oil"), "words": [
        "nariyal tel", "kobbari nune", "thengai ennai", "kobbari enne", "velichenna", "khobrel tel",
        "नारियल तेल", "కొబ్బరి నూనె", "தேங்காய் எண்ணெய்", "ಕೊಬ್ಬರಿ ಎಣ್ಣೆ", "വെളിച്ചെണ്ണ"]},
    {"std": "sunflower oil", "en": ("sunflower", "oil"), "words": [
        "suryakanthi nune", "sooraj mukhi tel", "सूरजमुखी तेल", "పొద్దుతిరుగుడు నూనె"]},

    # ── Dairy & eggs ────────────────────────────────────────────
    {"std": "milk", "en": ("milk", "doodh"), "words": [
        "paalu", "palu", "doodh", "dudh", "paal", "haalu", "dudha",
        "పాలు", "दूध", "பால்", "ಹಾಲು", "പാൽ", "দুধ", "દૂધ", "ਦੁੱਧ"]},
    {"std": "curd", "en": ("curd", "dahi", "yogurt"), "words": [
        "perugu", "thayir", "mosaru", "thairu", "doi", "dahin",
        "పెరుగు", "दही", "தயிர்", "ಮೊಸರು", "തൈര്", "দই", "દહીં", "ਦਹੀਂ"]},
    {"std": "buttermilk", "en": ("buttermilk", "chaas", "chhach"), "words": [
        "chaas", "chhach", "majjiga", "majjige", "moru", "taak", "ghol",
        "छाछ", "మజ్జిగ", "மோர்", "ಮಜ್ಜಿಗೆ", "മോര്", "ताक", "ঘোল", "છાશ"]},
    {"std": "ghee", "en": ("ghee",), "words": [
        "neyyi", "nei", "thuppa", "neyy", "ghi", "tup",
        "నెయ్యి", "घी", "நெய்", "ತುಪ್ಪ", "നെയ്യ്", "तूप", "ঘি", "ઘી", "ਘਿਓ"]},
    {"std": "butter", "en": ("butter", "makhan"), "words": [
        "venna", "makhan", "makkhan", "vennai", "benne", "makhon",
        "వెన్న", "मक्खन", "வெண்ணெய்", "ಬೆಣ್ಣೆ", "വെണ്ണ", "মাখন", "માખણ", "ਮੱਖਣ"]},
    {"std": "paneer", "en": ("paneer", "panir"), "words": [
        "panir", "ponir", "पनीर", "పనీర్", "பனீர்", "ಪನೀರ್", "പനീർ", "পনির", "પનીર", "ਪਨੀਰ"]},
    {"std": "egg", "en": ("egg", "eggs"), "words": [
        "gudlu", "guddu", "anda", "ande", "andey", "muttai", "motte", "mutta", "dim", "ainda",
        "గుడ్లు", "గుడ్డు", "अंडा", "अंडे", "முட்டை", "ಮೊಟ್ಟೆ", "മുട്ട", "अंडी", "ডিম", "ઈંડા", "ਅੰਡੇ"]},

    # ── Vegetables ──────────────────────────────────────────────
    {"std": "onion", "en": ("onion", "onions", "pyaz"), "words": [
        "ullipaya", "ullipayalu", "ulligadda", "pyaz", "pyaaz", "vengayam", "eerulli", "ulli", "kanda", "peyaj", "dungli",
        "ఉల్లిపాయ", "ఉల్లిపాయలు", "प्याज", "வெங்காயம்", "ಈರುಳ್ಳಿ", "ഉള്ളി", "कांदा", "পেঁয়াজ", "ડુંગળી", "ਪਿਆਜ਼"]},
    {"std": "potato", "en": ("potato", "potatoes", "aloo"), "words": [
        "bangaladumpa", "aloo", "alu", "urulaikizhangu", "alugadde", "urulakizhangu", "batata", "bataka",
        "బంగాళాదుంప", "आलू", "உருளைக்கிழங்கு", "ಆಲೂಗಡ್ಡೆ", "ഉരുളക്കിഴങ്ങ്", "बटाटा", "আলু", "બટાકા", "ਆਲੂ"]},
    {"std": "tomato", "en": ("tomato", "tomatoes", "tamatar"), "words": [
        "tamata", "tamatar", "thakkali", "tometo", "tameta",
        "టమాట", "టమాటా", "टमाटर", "தக்காளி", "ಟೊಮೇಟೊ", "തക്കാളി", "टोमॅटो", "টমেটো", "ટમેટા", "ਟਮਾਟਰ"]},
    {"std": "garlic", "en": ("garlic", "lahsun"), "words": [
        "lahsun", "lehsun", "vellulli", "poondu", "bellulli", "veluthulli", "lasun", "rosun", "lasan",
        "लहसुन", "వెల్లుల్లి", "பூண்டு", "ಬೆಳ್ಳುಳ್ಳಿ", "വെളുത്തുള്ളി", "लसूण", "রসুন", "લસણ", "ਲਸਣ"]},
    {"std": "ginger", "en": ("ginger", "adrak"), "words": [
        "adrak", "allam", "inji", "shunti", "inchi", "aadu",
        "अदरक", "అల్లం", "இஞ்சி", "ಶುಂಠಿ", "ഇഞ്ചി", "आले", "আদা", "આદુ", "ਅਦਰਕ"]},
    {"std": "coriander leaves", "en": ("coriander", "dhaniya", "leaves", "kothimeera"), "words": [
        "kothimeera", "kothamalli ilai", "kothambari soppu", "malli ila", "kothimbir", "dhone pata", "hara dhaniya",
        "కొత్తిమీర", "கொத்தமல்லி இலை", "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು", "മല്ലിയില", "कोथिंबीर", "ধনেপাতা", "કોથમીર", "ਹਰਾ ਧਨੀਆ"]},
    {"std": "curry leaves", "en": ("curry", "leaves"), "words": [
        "kadi patta", "kari patta", "karivepaku", "kariveppilai", "karibevu", "kariveppila", "kadipatta",
        "कड़ी पत्ता", "కరివేపాకు", "கறிவேப்பிலை", "ಕರಿಬೇವು", "കറിവേപ്പില", "कढीपत्ता", "কারিপাতা", "મીઠો લીમડો", "ਕੜੀ ਪੱਤਾ"]},
    {"std": "mint", "en": ("mint", "pudina"), "words": [
        "pudina", "pudhina", "putina",
        "पुदीना", "పుదీనా", "புதினா", "ಪುದೀನ", "പുതിന", "पुदिना", "পুদিনা", "ફુદીનો", "ਪੁਦੀਨਾ"]},
    {"std": "lemon", "en": ("lemon", "lemons", "lime", "nimbu"), "words": [
        "nimbu", "nimmakaya", "nimmakayalu", "elumichai", "nimbe", "cherunaranga", "limbu", "lebu",
        "नींबू", "నిమ్మకాయ", "எலுமிச்சை", "ನಿಂಬೆ", "ചെറുനാരങ്ങ", "लिंबू", "লেবু", "લીંબુ", "ਨਿੰਬੂ"]},
    {"std": "brinjal", "en": ("brinjal", "baingan", "eggplant"), "words": [
        "baingan", "vankaya", "kathirikai", "badanekai", "vazhuthana", "vangi", "begun", "ringan", "bataun",
        "बैंगन", "వంకాయ", "கத்திரிக்காய்", "ಬದನೆಕಾಯಿ", "വഴുതന", "वांगी", "বেগুন", "રીંગણ", "ਬੈਂਗਣ"]},
    {"std": "cauliflower", "en": ("cauliflower", "gobi"), "words": [
        "gobi", "phool gobi", "phulkopi", "hookosu",
        "गोभी", "फूलगोभी", "కాలీఫ్లవర్", "காலிஃபிளவர்", "ಹೂಕೋಸು", "കോളിഫ്ലവർ", "फ्लॉवर", "ফুলকপি", "ફ્લાવર", "ਗੋਭੀ"]},
    {"std": "cabbage", "en": ("cabbage",), "words": [
        "patta gobi", "bandh gobi", "band gobi", "muttaikose", "ele kosu", "bandhakopi", "kobi",
        "पत्ता गोभी", "క్యాబేజీ", "முட்டைக்கோஸ்", "ಎಲೆಕೋಸು", "കാബേജ്", "कोबी", "বাঁধাকপি", "કોબી", "ਬੰਦ ਗੋਭੀ"]},
    {"std": "carrot", "en": ("carrot", "carrots", "gajar"), "words": [
        "gajar", "gajjar", "gajor",
        "गाजर", "క్యారెట్", "கேரட்", "ಕ್ಯಾರೆಟ್", "കാരറ്റ്", "গাজর", "ગાજર", "ਗਾਜਰ"]},
    {"std": "bhindi", "en": ("bhindi", "okra", "ladies", "finger"), "words": [
        "bhindi", "bendakaya", "vendakkai", "bende", "vendakka", "bhendi", "dherosh", "bhinda", "ladies finger",
        "भिंडी", "బెండకాయ", "வெண்டைக்காய்", "ಬೆಂಡೆಕಾಯಿ", "വെണ്ടയ്ക്ക", "भेंडी", "ঢেঁড়স", "ભીંડા", "ਭਿੰਡੀ"]},
    {"std": "palak", "en": ("palak", "spinach"), "words": [
        "palak", "palakura", "pasalai keerai", "palak soppu", "palang shak",
        "पालक", "పాలకూర", "பசலைக் கீரை", "ಪಾಲಕ್", "പാലക്", "পালং শাক", "પાલક", "ਪਾਲਕ"]},
    {"std": "peas", "en": ("peas", "matar", "mutter"), "words": [
        "matar", "mattar", "mutter", "batani", "bataani", "pattani", "vatana", "motorshuti",
        "मटर", "బఠానీ", "பட்டாணி", "ಬಟಾಣಿ", "പട്ടാണി", "वाटाणा", "মটরশুঁটি", "વટાણા", "ਮਟਰ"]},
    {"std": "cucumber", "en": ("cucumber", "kheera"), "words": [
        "kheera", "khira", "dosakaya", "vellarikai", "southekai", "vellarikka", "kakdi", "shosha",
        "खीरा", "దోసకాయ", "வெள்ளரிக்காய்", "ಸೌತೆಕಾಯಿ", "വെള്ളരിക്ക", "काकडी", "শসা", "કાકડી", "ਖੀਰਾ"]},
    {"std": "lauki", "en": ("lauki", "dudhi", "gourd"), "words": [
        "lauki", "ghiya", "sorakaya", "anapakaya", "suraikai", "sorekai", "churakka", "dudhi",
        "लौकी", "సొరకాయ", "சுரைக்காய்", "ಸೋರೆಕಾಯಿ", "ചുരക്ക", "दुधी", "লাউ", "દૂધી", "ਘੀਆ"]},
    {"std": "karela", "en": ("karela", "bitter", "gourd"), "words": [
        "karela", "kakarakaya", "pavakkai", "hagalkai", "pavakka", "karle", "korola", "karelu",
        "करेला", "కాకరకాయ", "பாகற்காய்", "ಹಾಗಲಕಾಯಿ", "പാവയ്ക്ക", "कारले", "করলা", "કારેલા", "ਕਰੇਲਾ"]},
    {"std": "beans", "en": ("beans",), "words": [
        "french beans", "beans kaya", "ఫ్రెంచ్ బీన్స్", "బీన్స్", "பீன்ஸ்", "ಬೀನ್ಸ್", "ബീൻസ്", "बीन्स", "ফ্রেঞ্চ বিন"]},
    {"std": "drumstick", "en": ("drumstick", "drumsticks", "moringa"), "words": [
        "munagakaya", "munaga", "murungakkai", "nuggekai", "muringakka", "sahjan", "shevga", "sajne", "sargavo",
        "सहजन", "మునగకాయ", "முருங்கைக்காய்", "ನುಗ್ಗೆಕಾಯಿ", "മുരിങ്ങക്കായ്", "शेवगा", "সজনে", "સરગવો", "ਸੁਹੰਜਣਾ"]},
    {"std": "coconut", "en": ("coconut", "nariyal"), "words": [
        "nariyal", "kobbari", "kobbarikaya", "thengai", "tenginakayi", "thenga", "naral", "narkel",
        "नारियल", "కొబ్బరి", "தேங்காய்", "ತೆಂಗಿನಕಾಯಿ", "തേങ്ങ", "नारळ", "নারকেল", "નાળિયેર", "ਨਾਰੀਅਲ"]},

    # ── Fruits ──────────────────────────────────────────────────
    {"std": "banana", "en": ("banana", "bananas", "kela"), "words": [
        "kela", "arati pandu", "aratipandu", "vazhaipazham", "balehannu", "pazham", "keli",
        "केला", "అరటి పండు", "வாழைப்பழம்", "ಬಾಳೆಹಣ್ಣು", "പഴം", "केळी", "কলা", "કેળા", "ਕੇਲਾ"]},
    {"std": "apple", "en": ("apple", "apples", "seb"), "words": [
        "seb", "saib", "safarchand", "aapil", "sebu",
        "सेब", "ఆపిల్", "ஆப்பிள்", "ಸೇಬು", "ആപ്പിൾ", "सफरचंद", "আপেল", "સફરજન", "ਸੇਬ"]},
    {"std": "mango", "en": ("mango", "mangoes", "aam"), "words": [
        "mamidi", "mamidipandu", "maambazham", "mavinahannu", "manga", "amba", "keri",
        "आम", "మామిడి", "மாம்பழம்", "ಮಾವಿನಹಣ್ಣು", "മാങ്ങ", "आंबा", "আম", "કેરી", "ਅੰਬ"]},
    {"std": "orange", "en": ("orange", "oranges", "santra"), "words": [
        "santra", "narinja", "kamala pandu", "kittale", "narangi", "komola",
        "संतरा", "నారింజ", "ஆரஞ்சு", "ಕಿತ್ತಳೆ", "ഓറഞ്ച്", "संत्रा", "কমলালেবু", "સંતરા", "ਸੰਤਰਾ"]},
    {"std": "grapes", "en": ("grapes", "angoor"), "words": [
        "angoor", "angur", "draksha", "thratchai", "drakshi", "munthiri",
        "अंगूर", "ద్రాక్ష", "திராட்சை", "ದ್ರಾಕ್ಷಿ", "മുന്തിരി", "द्राक्षे", "আঙুর", "દ્રાક્ષ", "ਅੰਗੂਰ"]},

    # ── Dry fruits ──────────────────────────────────────────────
    {"std": "cashew", "en": ("cashew", "cashews", "kaju"), "words": [
        "kaju", "jeedipappu", "mundhiri", "godambi", "andiparippu",
        "काजू", "జీడిపప్పు", "முந்திரி", "ಗೋಡಂಬಿ", "അണ്ടിപ്പരിപ്പ്", "কাজু", "કાજુ", "ਕਾਜੂ"]},
    {"std": "almond", "en": ("almond", "almonds", "badam"), "words": [
        "badam", "baadam",
        "बादाम", "బాదం", "பாதாம்", "ಬಾದಾಮಿ", "ബദാം", "বাদাম", "બદામ", "ਬਦਾਮ"]},
    {"std": "raisins", "en": ("raisins", "kishmish", "kismis"), "words": [
        "kishmish", "kismis", "endu draksha", "ularndha thratchai", "ona drakshi", "unakka munthiri", "manuka",
        "किशमिश", "కిస్మిస్", "உலர் திராட்சை", "ಒಣದ್ರಾಕ್ಷಿ", "ഉണക്കമുന്തിരി", "मनुका", "কিশমিশ", "કિસમિસ", "ਕਿਸ਼ਮਿਸ਼"]},

    # ── Packaged, beverages, household ──────────────────────────
    {"std": "tea", "en": ("tea", "chai"), "words": [
        "chai", "chaha", "teepodi", "tea podi", "theyilai",
        "चाय", "టీ పొడి", "தேயிலை", "டீ", "ಚಹಾ", "ചായപ്പൊടി", "चहा", "চা পাতা", "ચા", "ਚਾਹ ਪੱਤੀ"]},
    {"std": "coffee", "en": ("coffee",), "words": [
        "kaapi", "kapi", "कॉफी", "కాఫీ", "காபி", "ಕಾಫಿ", "കാപ്പി", "কফি", "કોફી", "ਕੌਫੀ"]},
    {"std": "biscuit", "en": ("biscuit", "biscuits"), "words": [
        "biskut", "biscut", "बिस्कुट", "బిస్కెట్", "பிஸ்கட்", "ಬಿಸ್ಕತ್", "ബിസ്കറ്റ്", "বিস্কুট", "બિસ્કિટ", "ਬਿਸਕੁਟ"]},
    {"std": "noodles", "en": ("noodles",), "words": ["नूडल्स", "నూడుల్స్", "நூடுல்ஸ்", "ನೂಡಲ್ಸ್", "നൂഡിൽസ്"]},
    {"std": "bread", "en": ("bread",), "words": [
        "pav", "paav", "double roti",
        "బ్రెడ్", "ब्रेड", "ரொட்டி", "ಬ್ರೆಡ್", "ബ്രെഡ്", "पाव", "পাউরুটি", "બ્રેડ", "ਬ੍ਰੈੱਡ"]},
    {"std": "papad", "en": ("papad", "appalam", "pappadam"), "words": [
        "papad", "appadam", "appalam", "happala", "pappadam",
        "पापड़", "అప్పడం", "அப்பளம்", "ಹಪ್ಪಳ", "പപ്പടം", "पापड", "পাঁপড়", "પાપડ", "ਪਾਪੜ"]},
    {"std": "pickle", "en": ("pickle", "achar"), "words": [
        "achar", "aachar", "achaar", "oorugaya", "oorugai", "uppinakayi", "lonche", "athanu",
        "अचार", "ఊరగాయ", "ஊறுகாய்", "ಉಪ್ಪಿನಕಾಯಿ", "അച്ചാർ", "लोणचे", "আচার", "અથાણું", "ਅਚਾਰ"]},
    {"std": "honey", "en": ("honey", "shahad"), "words": [
        "shahad", "tene", "jenu", "madh", "modhu",
        "शहद", "తేనె", "தேன்", "ಜೇನು", "തേൻ", "मध", "মধু", "મધ", "ਸ਼ਹਿਦ"]},
    {"std": "soap", "en": ("soap",), "words": [
        "sabbu", "sabun", "sopu", "saban",
        "సబ్బు", "साबुन", "சோப்பு", "ಸೋಪು", "സോപ്പ്", "साबण", "সাবান", "સાબુ", "ਸਾਬਣ"]},
    {"std": "detergent", "en": ("detergent", "washing", "powder", "surf"), "words": [
        "washing powder", "kapde dhone ka powder", "battala powder", "sarf",
        "डिटर्जेंट", "వాషింగ్ పౌడర్", "சலவை தூள்", "ಡಿಟರ್ಜೆಂಟ್", "ഡിറ്റർജന്റ്", "कपडे धुण्याची पावडर"]},
    {"std": "toothpaste", "en": ("toothpaste", "paste"), "words": [
        "manjan", "tooth paste",
        "टूथपेस्ट", "టూత్ పేస్ట్", "பற்பசை", "ಟೂತ್ ಪೇಸ್ಟ್", "ടൂത്ത്പേസ്റ്റ്", "টুথপেস্ট", "ટૂથપેસ્ટ"]},
    {"std": "shampoo", "en": ("shampoo",), "words": [
        "shampu", "शैम्पू", "షాంపూ", "ஷாம்பு", "ಶಾಂಪೂ", "ഷാംപൂ", "শ্যাম্পু", "શેમ્પૂ", "ਸ਼ੈਂਪੂ"]},
    {"std": "matchbox", "en": ("matchbox", "matches", "match"), "words": [
        "machis", "maachis", "aggipetti", "aggi pette", "theepetti", "benkipotna", "kadepeti",
        "माचिस", "అగ్గిపెట్టె", "தீப்பெட்டி", "ಬೆಂಕಿಪೊಟ್ಟಣ", "തീപ്പെട്ടി", "काडेपेटी", "দেশলাই", "દીવાસળી", "ਮਾਚਿਸ"]},
    {"std": "agarbatti", "en": ("agarbatti", "incense"), "words": [
        "agarbatti", "agarabatti", "udhubathi", "oodhubathi",
        "अगरबत्ती", "అగరబత్తి", "ஊதுபத்தி", "ಊದುಬತ್ತಿ", "ചന്ദനത്തിരി", "উদবাতি", "ধূপকাঠি", "અગરબત્તી", "ਅਗਰਬੱਤੀ"]},
    {"std": "candle", "en": ("candle", "candles"), "words": [
        "mombatti", "kovvotti", "mezhuguvarthi", "menabatti", "mezhukuthiri",
        "मोमबत्ती", "కొవ్వొత్తి", "மெழுகுவர்த்தி", "ಮೇಣದಬತ್ತಿ", "മെഴുകുതിരി", "मेणबत्ती", "মোমবাতি", "મીણબત્તી", "ਮੋਮਬੱਤੀ"]},
    {"std": "water", "en": ("water", "bisleri"), "words": [
        "paani", "pani", "neellu", "thanni", "neeru", "vellam kuppi",
        "पानी", "నీళ్లు", "தண்ணீர்", "ನೀರು", "വെള്ളം", "पाणी", "জল", "પાણી", "ਪਾਣੀ"]},
]
