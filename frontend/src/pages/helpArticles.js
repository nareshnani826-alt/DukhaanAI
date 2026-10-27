// Help guide shown on /help — written for the current app (bottom menu Home · Bill · Stock · Khata · More).
// Every title/content is { en, te, hi }; other languages fall back to English.
// Formatting inside content: "1." steps, "•" points, "→" tips, a line ending in ":" is a heading.

export const HELP_SECTIONS = [
  {
    id: "getting-started", icon: "🚀", color: "var(--jade)", bg: "#E1F5EE",
    title: { en: "Getting started", te: "మొదలుపెట్టడం", hi: "शुरुआत" },
    articles: [
      {
        title: { en: "What is DukaanAI?", te: "DukaanAI అంటే ఏమిటి?", hi: "DukaanAI क्या है?" },
        content: {
          en: `DukaanAI is a billing and stock app for kirana shops.

The menu at the bottom:
• Home — today's sales, what needs attention
• Bill — make a bill
• Stock — your items, prices and quantity
• Khata — who owes you money (udhaar)
• More — everything else: past bills, damaged goods, expiry, reports, settings, help

You can use it without an account (data stays on this phone only), or log in to keep your data safe online and use it on more than one phone.`,
          te: `DukaanAI కిరాణా దుకాణాల కోసం బిల్లింగ్, స్టాక్ యాప్.

కింద ఉన్న మెనూ:
• హోమ్ — ఈరోజు అమ్మకాలు, చూడాల్సినవి
• బిల్ — బిల్ చేయండి
• స్టాక్ — మీ సరుకులు, ధరలు, పరిమాణం
• ఖాతా — ఎవరు ఎంత బాకీ (ఉధార్)
• మరిన్ని — పాత బిల్లులు, పాడైన సరుకు, గడువు, రిపోర్టులు, సెట్టింగ్స్, సహాయం

ఖాతా లేకుండా కూడా వాడవచ్చు (డేటా ఈ ఫోన్‌లోనే ఉంటుంది), లేదా లాగిన్ అయితే డేటా ఆన్‌లైన్‌లో సురక్షితంగా ఉంటుంది, ఎక్కువ ఫోన్లలో వాడవచ్చు.`,
          hi: `DukaanAI किराना दुकानों के लिए बिलिंग और स्टॉक ऐप है।

नीचे का मेनू:
• होम — आज की बिक्री, ध्यान देने वाली बातें
• बिल — बिल बनाएं
• स्टॉक — आपका सामान, कीमत और मात्रा
• खाता — किसका कितना उधार बाकी है
• और — पुराने बिल, खराब माल, एक्सपायरी, रिपोर्ट, सेटिंग्स, मदद

बिना खाते के भी चला सकते हैं (डेटा सिर्फ़ इस फ़ोन में रहेगा), या लॉगिन करें तो डेटा ऑनलाइन सुरक्षित रहेगा और कई फ़ोन पर चलेगा।`,
        },
      },
      {
        title: { en: "Free, Pro and Wholesale plans", te: "ఉచిత, Pro, హోల్‌సేల్ ప్లాన్లు", hi: "मुफ़्त, Pro और होलसेल प्लान" },
        content: {
          en: `Free (₹0):
• Billing, stock and khata on one phone

Pro (₹299/month):
• Data saved online — use on any phone
• Voice billing in 10 languages
• Barcode scanner, customer history
• Day open/close with profit report
• Reports and GST summary, low stock alerts

Wholesale (₹799/month):
• Everything in Pro
• Staff logins (owner, manager, cashier)
• Product photo scanner (AI), staff activity log, data export

→ See or change your plan in More → Settings.`,
          te: `ఉచిత (₹0):
• ఒక ఫోన్‌లో బిల్లింగ్, స్టాక్, ఖాతా

Pro (నెలకు ₹299):
• డేటా ఆన్‌లైన్‌లో — ఏ ఫోన్‌లోనైనా వాడండి
• 10 భాషల్లో వాయిస్ బిల్లింగ్
• బార్‌కోడ్ స్కానర్, కస్టమర్ చరిత్ర
• దుకాణం తెరువు/మూసివేయి, లాభం రిపోర్ట్
• రిపోర్టులు, GST లెక్క, తక్కువ స్టాక్ అలర్ట్

హోల్‌సేల్ (నెలకు ₹799):
• Proలో ఉన్నవన్నీ
• సిబ్బంది లాగిన్ (యజమాని, మేనేజర్, క్యాషియర్)
• ఫోటోతో సరుకు గుర్తింపు (AI), సిబ్బంది పనుల లెక్క, డేటా డౌన్‌లోడ్

→ మీ ప్లాన్ మరిన్ని → సెట్టింగ్స్‌లో చూడండి.`,
          hi: `मुफ़्त (₹0):
• एक फ़ोन पर बिलिंग, स्टॉक और खाता

Pro (₹299/महीना):
• डेटा ऑनलाइन — किसी भी फ़ोन पर चलाएं
• 10 भाषाओं में आवाज़ से बिलिंग
• बारकोड स्कैनर, ग्राहक का हिसाब
• दुकान खोलें/बंद करें, मुनाफ़ा रिपोर्ट
• रिपोर्ट, GST हिसाब, कम स्टॉक अलर्ट

होलसेल (₹799/महीना):
• Pro की सारी सुविधाएं
• स्टाफ लॉगिन (मालिक, मैनेजर, कैशियर)
• फ़ोटो से सामान पहचान (AI), स्टाफ के कामों का हिसाब, डेटा डाउनलोड

→ अपना प्लान और → सेटिंग्स में देखें।`,
        },
      },
    ],
  },
  {
    id: "billing", icon: "🧾", color: "#EF9F27", bg: "#FAEEDA",
    title: { en: "Billing", te: "బిల్లింగ్", hi: "बिलिंग" },
    articles: [
      {
        title: { en: "Make a bill", te: "బిల్ చేయడం", hi: "बिल बनाना" },
        content: {
          en: `1. Tap Bill in the bottom menu
2. Tap an item to add it — tap again to add one more
3. To find an item: type its name in the search box, tap 🎤 and say it, or tap 📷 to scan its barcode
4. Tap "see bill" to check the items, change quantity with − and +
5. Tap Pay → check the bill → Confirm & Generate Invoice

Easy billing:
• Tap ⚡ Easy at the top for big pictures
• Tap pictures, then the green PAID button — the bill is saved and the total is spoken out
• Tap "Full mode" to go back

→ The app never lets you sell more than you have in stock.`,
          te: `1. కింద మెనూలో బిల్ నొక్కండి
2. సరుకుపై నొక్కితే బిల్‌లో చేరుతుంది — మళ్ళీ నొక్కితే ఇంకొకటి
3. సరుకు వెతకడానికి: పేరు టైప్ చేయండి, 🎤 నొక్కి చెప్పండి, లేదా 📷 నొక్కి బార్‌కోడ్ స్కాన్ చేయండి
4. "బిల్ చూడండి" నొక్కి సరుకులు చూడండి, − + తో పరిమాణం మార్చండి
5. చెల్లింపు నొక్కండి → బిల్ చూసి → బిల్ సేవ్ చేయి

సులభ బిల్:
• పైన ⚡ సులభ బిల్ నొక్కితే పెద్ద బొమ్మలు వస్తాయి
• బొమ్మలు నొక్కి, ఆకుపచ్చ పూర్తి బటన్ నొక్కండి — బిల్ సేవ్ అవుతుంది, మొత్తం చెబుతుంది
• వెనక్కి వెళ్ళడానికి "పూర్తి స్క్రీన్" నొక్కండి

→ స్టాక్‌లో ఉన్నదానికంటే ఎక్కువ అమ్మడానికి యాప్ ఒప్పుకోదు.`,
          hi: `1. नीचे मेनू में बिल दबाएं
2. सामान पर टैप करें तो बिल में जुड़ेगा — दोबारा टैप करें तो एक और
3. सामान ढूंढने के लिए: नाम लिखें, 🎤 दबाकर बोलें, या 📷 दबाकर बारकोड स्कैन करें
4. "बिल देखें" दबाकर सामान देखें, − + से मात्रा बदलें
5. भुगतान दबाएं → बिल देखें → बिल पक्का करें

आसान बिल:
• ऊपर ⚡ आसान बिल दबाएं तो बड़ी तस्वीरें आएंगी
• तस्वीरें दबाएं, फिर हरा "पैसे मिले" बटन — बिल सेव होगा और कुल रकम बोली जाएगी
• वापस जाने के लिए "पूरी स्क्रीन" दबाएं

→ स्टॉक से ज़्यादा बेचने नहीं देता।`,
        },
      },
      {
        title: { en: "Loose items — 100 g, 250 g, ₹20 worth", te: "లూజ్ సరుకు — 100 గ్రా, 250 గ్రా, ₹20 విలువ", hi: "खुला सामान — 100 ग्रा, 250 ग्रा, ₹20 का" },
        content: {
          en: `For sugar, dal, rice or oil sold from a bag or tin:

Add it once:
1. Stock → + Add
2. Under "How do you sell it?" choose Loose · per kg (or per litre)
3. Enter the price per kg and how many kg you have

At billing:
• Tap the item — pick 50 g, 100 g, 250 g, 500 g, 1 kg or 2 kg
• Or type grams, or a ₹ amount ("give me ₹20 of sugar")
• In the bill, tap the weight to change it; − takes off 1 kg (100 g below 1 kg)

Big bags (CHANA 50 KG):
• Items with a bag size of 5 kg or more in the name can be sold loose too — the price per kg comes from the bag price, and "Full bag" sells the whole bag`,
          te: `సంచి లేదా డబ్బా నుండి అమ్మే చక్కెర, పప్పు, బియ్యం, నూనె కోసం:

ఒకసారి జోడించండి:
1. స్టాక్ → + జోడించు
2. "ఎలా అమ్ముతారు?" దగ్గర లూజ్ · కిలోకి (లేదా లీటరుకి) ఎంచుకోండి
3. కిలో ధర, ఎన్ని కిలోలు ఉన్నాయో రాయండి

బిల్ చేసేటప్పుడు:
• సరుకుపై నొక్కి 50 గ్రా, 100 గ్రా, 250 గ్రా, 500 గ్రా, 1 కిలో, 2 కిలోలు ఎంచుకోండి
• లేదా గ్రాములు రాయండి, లేదా ₹ మొత్తం ("₹20 చక్కెర ఇవ్వండి")
• బిల్‌లో బరువుపై నొక్కి మార్చవచ్చు; − నొక్కితే 1 కిలో తగ్గుతుంది (1 కిలో కంటే తక్కువైతే 100 గ్రా)

పెద్ద సంచులు (CHANA 50 KG):
• పేరులో 5 కిలోలు లేదా అంతకంటే ఎక్కువ బరువు ఉంటే లూజ్‌గా అమ్మవచ్చు — కిలో ధర సంచి ధర నుండి వస్తుంది, "మొత్తం బస్తా" నొక్కితే పూర్తి సంచి`,
          hi: `बोरी या डिब्बे से बिकने वाली चीनी, दाल, चावल, तेल के लिए:

एक बार जोड़ें:
1. स्टॉक → + जोड़ें
2. "कैसे बेचते हैं?" में खुला · प्रति किलो (या प्रति लीटर) चुनें
3. किलो का दाम और कितने किलो हैं, लिखें

बिल बनाते समय:
• सामान पर टैप करें — 50 ग्रा, 100 ग्रा, 250 ग्रा, 500 ग्रा, 1 किलो या 2 किलो चुनें
• या ग्राम लिखें, या ₹ रकम ("₹20 की चीनी दो")
• बिल में वज़न पर टैप करके बदलें; − से 1 किलो घटता है (1 किलो से कम पर 100 ग्रा)

बड़ी बोरी (CHANA 50 KG):
• नाम में 5 किलो या ज़्यादा वज़न हो तो खुला बेच सकते हैं — किलो का दाम बोरी के दाम से निकलता है, "पूरी बोरी" से पूरी बोरी बिकती है`,
        },
      },
      {
        title: { en: "GST, WhatsApp and printing", te: "GST, WhatsApp, ప్రింట్", hi: "GST, WhatsApp और प्रिंट" },
        content: {
          en: `GST:
• In the bill, tick "Add GST to this bill"
• GST is split into CGST and SGST automatically (5% → 2.5% + 2.5%)
• To add GST to every bill, turn on "Apply GST by default" in Settings

After saving a bill:
• Send on WhatsApp — opens WhatsApp with the full bill
• Print — prints the bill
• Old bills: More → Past bills — search, print, send again or cancel (void) a bill`,
          te: `GST:
• బిల్‌లో "ఈ బిల్‌కు GST జోడించు" టిక్ చేయండి
• GST తానే CGST, SGSTగా విడిపోతుంది (5% → 2.5% + 2.5%)
• ప్రతి బిల్‌కు GST కావాలంటే సెట్టింగ్స్‌లో "ప్రతి బిల్‌కు GST" ఆన్ చేయండి

బిల్ సేవ్ అయ్యాక:
• WhatsAppలో పంపు — పూర్తి బిల్‌తో WhatsApp తెరుచుకుంటుంది
• ప్రింట్ — బిల్ ప్రింట్ అవుతుంది
• పాత బిల్లులు: మరిన్ని → పాత బిల్లులు — వెతకండి, ప్రింట్, మళ్ళీ పంపండి లేదా రద్దు చేయండి`,
          hi: `GST:
• बिल में "इस बिल में GST जोड़ें" पर टिक करें
• GST अपने आप CGST और SGST में बंटता है (5% → 2.5% + 2.5%)
• हर बिल में GST चाहिए तो सेटिंग्स में "हर बिल पर GST" चालू करें

बिल सेव होने के बाद:
• WhatsApp पर भेजें — पूरे बिल के साथ WhatsApp खुलेगा
• प्रिंट — बिल प्रिंट होगा
• पुराने बिल: और → पुराने बिल — खोजें, प्रिंट करें, दोबारा भेजें या रद्द करें`,
        },
      },
    ],
  },
  {
    id: "stock", icon: "📦", color: "#378ADD", bg: "#E6F1FB",
    title: { en: "Stock", te: "స్టాక్", hi: "स्टॉक" },
    articles: [
      {
        title: { en: "Add items and stock", te: "సరుకులు, స్టాక్ జోడించడం", hi: "सामान और स्टॉक जोड़ना" },
        content: {
          en: `New item:
1. Stock → + Add
2. Type the name (or tap 🎤 and say it)
3. Choose how you sell it: Packet / piece, or Loose per kg / litre
4. Enter the selling price and how many you have → Save product
→ "More details" has buying price (for profit), warn-below level, category, GST and barcode

New delivery of an item you already have:
• Tap + Stock on that item and enter how many came

Many items at once:
• More → Add many items — from an Excel or CSV price list`,
          te: `కొత్త సరుకు:
1. స్టాక్ → + జోడించు
2. పేరు రాయండి (లేదా 🎤 నొక్కి చెప్పండి)
3. ఎలా అమ్ముతారో ఎంచుకోండి: ప్యాకెట్ / ఒక్కటి, లేదా లూజ్ కిలోకి / లీటరుకి
4. అమ్మకం ధర, ఎన్ని ఉన్నాయో రాసి → సేవ్ చేయి
→ "మరిన్ని వివరాలు"లో కొనుగోలు ధర (లాభం కోసం), హెచ్చరిక స్థాయి, రకం, GST, బార్‌కోడ్

ఉన్న సరుకు కొత్తగా వస్తే:
• ఆ సరుకుపై + స్టాక్ నొక్కి ఎన్ని వచ్చాయో రాయండి

ఒకేసారి చాలా సరుకులు:
• మరిన్ని → చాలా వస్తువులు జోడించు — Excel లేదా CSV ధరల జాబితా నుండి`,
          hi: `नया सामान:
1. स्टॉक → + जोड़ें
2. नाम लिखें (या 🎤 दबाकर बोलें)
3. कैसे बेचते हैं चुनें: पैकेट / नग, या खुला प्रति किलो / लीटर
4. बिक्री कीमत और कितने हैं लिखें → सेव करें
→ "और जानकारी" में खरीद कीमत (मुनाफ़े के लिए), चेतावनी स्तर, श्रेणी, GST और बारकोड

पहले से मौजूद सामान का नया माल आया:
• उस सामान पर + स्टॉक दबाएं और कितना आया लिखें

एक साथ कई सामान:
• और → कई सामान जोड़ें — Excel या CSV सूची से`,
        },
      },
      {
        title: { en: "Low stock, expiry and damaged goods", te: "తక్కువ స్టాక్, గడువు, పాడైన సరుకు", hi: "कम स्टॉक, एक्सपायरी और खराब माल" },
        content: {
          en: `Low stock:
• Home shows items running low or out of stock
• Set the warn-below level per item (Stock → ✏️ → More details)

Expiring soon:
• More → Expiring soon lists items that may be past their date — tap a card at the top to filter, 🔔 Voice Alert reads them out

Damaged or spoiled goods:
• More → Damaged goods → + Record Wastage
• Pick the item, how many and the reason — stock goes down and the loss is counted`,
          te: `తక్కువ స్టాక్:
• తక్కువగా ఉన్న, అయిపోయిన సరుకులు హోమ్‌లో కనిపిస్తాయి
• ప్రతి సరుకుకు హెచ్చరిక స్థాయి పెట్టండి (స్టాక్ → ✏️ → మరిన్ని వివరాలు)

గడువు:
• మరిన్ని → త్వరలో గడువు ముగిసేవి — పైన కార్డ్ నొక్కితే ఆ రకం మాత్రమే, 🔔 వాయిస్ అలర్ట్ చదివి చెబుతుంది

పాడైన సరుకు:
• మరిన్ని → పాడైన సరుకు → + పాడైన సరుకు రాయండి
• సరుకు, ఎన్ని, కారణం ఎంచుకోండి — స్టాక్ తగ్గుతుంది, నష్టం లెక్కలోకి వస్తుంది`,
          hi: `कम स्टॉक:
• कम बचा या खत्म सामान होम पर दिखता है
• हर सामान का चेतावनी स्तर रखें (स्टॉक → ✏️ → और जानकारी)

एक्सपायरी:
• और → जल्द एक्सपायर होने वाले — ऊपर कार्ड दबाकर छांटें, 🔔 आवाज़ में अलर्ट पढ़कर सुनाता है

खराब माल:
• और → खराब माल → + खराब माल लिखें
• सामान, कितना और कारण चुनें — स्टॉक घटेगा और नुकसान गिना जाएगा`,
        },
      },
    ],
  },
  {
    id: "khata", icon: "📒", color: "#7c3aed", bg: "#F1EBFD",
    title: { en: "Khata (udhaar)", te: "ఖాతా (ఉధార్)", hi: "खाता (उधार)" },
    articles: [
      {
        title: { en: "Write udhaar and take payment", te: "ఉధార్ రాయడం, డబ్బు తీసుకోవడం", hi: "उधार लिखना और पैसे लेना" },
        content: {
          en: `1. Tap Khata in the bottom menu
2. + Add Customer — name and phone (the phone is for WhatsApp reminders)
3. Tap the customer → Add Udhar → enter the amount
4. When they pay: tap the customer → ✓ Record Payment

• The top shows the total you have to collect
• Send Reminder on WhatsApp sends a polite reminder with the amount
• Each entry can be sent as proof on WhatsApp or printed as a receipt`,
          te: `1. కింద మెనూలో ఖాతా నొక్కండి
2. + కస్టమర్ జోడించు — పేరు, ఫోన్ (WhatsApp గుర్తు కోసం)
3. కస్టమర్‌పై నొక్కి → ఉధార్ రాయి → మొత్తం రాయండి
4. డబ్బు ఇచ్చినప్పుడు: కస్టమర్‌పై నొక్కి → ✓ డబ్బు వచ్చింది

• పైన మొత్తం వసూలు చేయాల్సింది కనిపిస్తుంది
• "WhatsAppలో గుర్తు చేయండి" మొత్తంతో మర్యాదగా గుర్తు చేస్తుంది
• ప్రతి లావాదేవీని WhatsAppలో రుజువుగా పంపవచ్చు లేదా ప్రింట్ చేయవచ్చు`,
          hi: `1. नीचे मेनू में खाता दबाएं
2. + ग्राहक जोड़ें — नाम और फ़ोन (WhatsApp याद दिलाने के लिए)
3. ग्राहक पर टैप करें → उधार लिखें → रकम लिखें
4. पैसे मिलने पर: ग्राहक पर टैप करें → ✓ पैसे मिले

• ऊपर कुल वसूल करने वाली रकम दिखती है
• "WhatsApp पर याद दिलाएं" रकम के साथ याद दिलाता है
• हर लेन-देन WhatsApp पर सबूत के रूप में भेज सकते हैं या प्रिंट कर सकते हैं`,
        },
      },
    ],
  },
  {
    id: "voice", icon: "🎤", color: "var(--jade)", bg: "#E1F5EE",
    title: { en: "Voice", te: "వాయిస్", hi: "आवाज़" },
    articles: [
      {
        title: { en: "Speak in your language", te: "మీ భాషలో మాట్లాడండి", hi: "अपनी भाषा में बोलें" },
        content: {
          en: `Voice works in Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi and English. Change the language with the 🌐 button at the top.

Where to use it:
• Bill → 🎤 — say an item name to find it
• More → Speak a bill — say the whole bill: "రెండు పాలు, ఒక ఉప్పు"
• Stock → + Add → 🎤 — say the item name, price or quantity
• Home → 💬 — ask about your shop: "ఈరోజు అమ్మకాలు ఎంత?"

→ The app always shows what it understood before saving anything.`,
          te: `వాయిస్ తెలుగు, హిందీ, తమిళం, కన్నడ, మలయాళం, మరాఠీ, బెంగాలీ, గుజరాతీ, పంజాబీ, ఇంగ్లీష్‌లో పనిచేస్తుంది. పైన 🌐 బటన్‌తో భాష మార్చండి.

ఎక్కడ వాడాలి:
• బిల్ → 🎤 — సరుకు పేరు చెబితే వెతుకుతుంది
• మరిన్ని → మాట్లాడి బిల్ చేయి — మొత్తం బిల్ చెప్పండి: "రెండు పాలు, ఒక ఉప్పు"
• స్టాక్ → + జోడించు → 🎤 — సరుకు పేరు, ధర, పరిమాణం చెప్పండి
• హోమ్ → 💬 — దుకాణం గురించి అడగండి: "ఈరోజు అమ్మకాలు ఎంత?"

→ సేవ్ చేసే ముందు యాప్ ఏమి అర్థం చేసుకుందో చూపిస్తుంది.`,
          hi: `आवाज़ तेलुगु, हिंदी, तमिल, कन्नड़, मलयालम, मराठी, बंगाली, गुजराती, पंजाबी और अंग्रेज़ी में चलती है। ऊपर 🌐 बटन से भाषा बदलें।

कहाँ इस्तेमाल करें:
• बिल → 🎤 — सामान का नाम बोलें तो मिल जाएगा
• और → बोलकर बिल बनाएँ — पूरा बिल बोलें: "दो दूध और एक नमक"
• स्टॉक → + जोड़ें → 🎤 — सामान का नाम, कीमत या मात्रा बोलें
• होम → 💬 — दुकान के बारे में पूछें: "आज की बिक्री कितनी?"

→ कुछ भी सेव करने से पहले ऐप दिखाता है कि उसने क्या समझा।`,
        },
      },
      {
        title: { en: "Microphone not working", te: "మైక్ పనిచేయడం లేదు", hi: "माइक नहीं चल रहा" },
        content: {
          en: `"Microphone blocked":
→ In the app: phone Settings → Apps → DukaanAI → Permissions → Microphone → Allow
→ In Chrome: tap the 🔒 next to the address → Microphone → Allow, then reload

Item not found by voice:
→ Say the name the way it is saved in Stock, e.g. "Tata Salt"
→ Speak a little slowly, close to the phone

iPhone:
→ Use Safari: Settings → Safari → Microphone → Allow`,
          te: `"మైక్ బ్లాక్ అయింది" అని వస్తే:
→ యాప్‌లో: ఫోన్ Settings → Apps → DukaanAI → Permissions → Microphone → Allow
→ Chromeలో: అడ్రస్ పక్కన 🔒 నొక్కి → Microphone → Allow, తర్వాత పేజీ రీలోడ్

వాయిస్‌తో సరుకు దొరకకపోతే:
→ స్టాక్‌లో ఎలా సేవ్ చేశారో అలాగే చెప్పండి, ఉదా. "Tata Salt"
→ ఫోన్ దగ్గరగా, కొంచెం నెమ్మదిగా మాట్లాడండి

iPhone:
→ Safari వాడండి: Settings → Safari → Microphone → Allow`,
          hi: `"माइक ब्लॉक" दिखे तो:
→ ऐप में: फ़ोन Settings → Apps → DukaanAI → Permissions → Microphone → Allow
→ Chrome में: पते के पास 🔒 दबाएं → Microphone → Allow, फिर पेज रीलोड करें

आवाज़ से सामान न मिले तो:
→ स्टॉक में जैसा नाम सेव है वैसा बोलें, जैसे "Tata Salt"
→ फ़ोन के पास, थोड़ा धीरे बोलें

iPhone:
→ Safari इस्तेमाल करें: Settings → Safari → Microphone → Allow`,
        },
      },
    ],
  },
  {
    id: "day", icon: "☀️", color: "#7F77DD", bg: "#EEEDFE",
    title: { en: "Open / close day and profit", te: "దుకాణం తెరువు / మూసివేయి, లాభం", hi: "दुकान खोलें / बंद करें और मुनाफ़ा" },
    articles: [
      {
        title: { en: "Open and close the day", te: "దుకాణం తెరవడం, మూసివేయడం", hi: "दुकान खोलना और बंद करना" },
        content: {
          en: `Morning:
• The app asks "Open your store?" — tap Open Day Now. Your stock at opening is noted.

Night:
• Tap Close Day (Home, or More → Open / close day)
• You see today's sales, bills, profit and items to reorder, and can send the reorder list on WhatsApp

→ If yesterday was left open, the app asks you to close it first so the numbers stay right. You can skip it.`,
          te: `ఉదయం:
• "దుకాణం తెరవాలా?" అని అడుగుతుంది — ఇప్పుడే దుకాణం తెరువు నొక్కండి. ప్రారంభ స్టాక్ నమోదవుతుంది.

రాత్రి:
• దుకాణం మూసివేయి నొక్కండి (హోమ్‌లో, లేదా మరిన్ని → రోజు తెరువు / మూసివేయి)
• ఈరోజు అమ్మకాలు, బిల్లులు, లాభం, తెప్పించాల్సిన సరుకులు కనిపిస్తాయి; జాబితా WhatsAppలో పంపవచ్చు

→ నిన్నటి రోజు మూసివేయకపోతే, లెక్క సరిగ్గా ఉండటానికి ముందు దాన్ని మూసివేయమని అడుగుతుంది. వదిలేయవచ్చు కూడా.`,
          hi: `सुबह:
• ऐप पूछेगा "दुकान खोलें?" — अभी दुकान खोलें दबाएं। शुरुआती स्टॉक नोट हो जाएगा।

रात:
• दुकान बंद करें दबाएं (होम पर, या और → दिन खोलें / बंद करें)
• आज की बिक्री, बिल, मुनाफ़ा और मंगाने वाला सामान दिखेगा; सूची WhatsApp पर भेज सकते हैं

→ कल का दिन खुला रह गया हो तो हिसाब सही रखने के लिए पहले उसे बंद करने को कहेगा। छोड़ भी सकते हैं।`,
        },
      },
      {
        title: { en: "How profit is worked out", te: "లాభం ఎలా లెక్కిస్తారు", hi: "मुनाफ़ा कैसे निकलता है" },
        content: {
          en: `Profit = selling price − buying price, for everything sold.

Example:
• You sold 10 Tata Salt at ₹28 = ₹280
• You bought them at ₹22 = ₹220
• Profit = ₹60

→ Enter the buying price for each item (Stock → ✏️ → More details), otherwise profit shows as ₹0.
→ This does not include rent, electricity or salaries.`,
          te: `లాభం = అమ్మిన ధర − కొన్న ధర, అమ్మిన అన్నింటికీ.

ఉదాహరణ:
• 10 Tata Salt ₹28కి అమ్మారు = ₹280
• ₹22కి కొన్నారు = ₹220
• లాభం = ₹60

→ ప్రతి సరుకుకు కొనుగోలు ధర రాయండి (స్టాక్ → ✏️ → మరిన్ని వివరాలు), లేకపోతే లాభం ₹0 చూపిస్తుంది.
→ ఇందులో అద్దె, కరెంట్, జీతాలు లేవు.`,
          hi: `मुनाफ़ा = बिक्री कीमत − खरीद कीमत, जो भी बिका उस पर।

उदाहरण:
• 10 Tata Salt ₹28 में बेचे = ₹280
• ₹22 में खरीदे थे = ₹220
• मुनाफ़ा = ₹60

→ हर सामान की खरीद कीमत लिखें (स्टॉक → ✏️ → और जानकारी), नहीं तो मुनाफ़ा ₹0 दिखेगा।
→ इसमें किराया, बिजली या तनख्वाह शामिल नहीं है।`,
        },
      },
    ],
  },
  {
    id: "settings", icon: "⚙️", color: "#888780", bg: "#F1EFE8",
    title: { en: "Settings and your data", te: "సెట్టింగ్స్, మీ డేటా", hi: "सेटिंग्स और आपका डेटा" },
    articles: [
      {
        title: { en: "Fewer buttons, more buttons", te: "తక్కువ బటన్లు, ఎక్కువ బటన్లు", hi: "कम बटन, ज़्यादा बटन" },
        content: {
          en: `More → Show features:
• Simple — only billing, stock, khata and past bills
• Standard — adds customers, day close, damaged goods and more
• All — every feature, including reports and AI

More → Settings → Feature Settings turns single features on or off. Turning a feature off never deletes data.`,
          te: `మరిన్ని → ఫీచర్లు చూపించు:
• సులభం — బిల్లింగ్, స్టాక్, ఖాతా, పాత బిల్లులు మాత్రమే
• సాధారణ — కస్టమర్లు, రోజు మూసివేత, పాడైన సరుకు కూడా
• అన్నీ — రిపోర్టులు, AI సహా అన్ని సౌకర్యాలు

మరిన్ని → సెట్టింగ్స్ → సౌకర్యాలు లో ఒక్కొక్కటి ఆన్/ఆఫ్ చేయవచ్చు. ఆఫ్ చేసినా డేటా పోదు.`,
          hi: `और → फ़ीचर दिखाएँ:
• सरल — सिर्फ़ बिलिंग, स्टॉक, खाता और पुराने बिल
• साधारण — ग्राहक, दिन बंद, खराब माल और भी
• सभी — रिपोर्ट और AI समेत सारी सुविधाएं

और → सेटिंग्स → सुविधाएं में एक-एक सुविधा चालू/बंद करें। बंद करने से डेटा नहीं मिटता।`,
        },
      },
      {
        title: { en: "Where your data is kept", te: "మీ డేటా ఎక్కడ ఉంటుంది", hi: "आपका डेटा कहाँ रहता है" },
        content: {
          en: `Without an account:
• Everything stays on this phone only. Uninstalling the app or clearing browser data deletes it.

With Pro or Wholesale:
• Products, bills, khata and customers are saved online
• Log in with the same email on another phone and everything is there

→ To protect your shop's data, log in and use Pro.`,
          te: `ఖాతా లేకుండా:
• అంతా ఈ ఫోన్‌లోనే. యాప్ తీసేసినా, బ్రౌజర్ డేటా క్లియర్ చేసినా పోతుంది.

Pro లేదా హోల్‌సేల్‌తో:
• సరుకులు, బిల్లులు, ఖాతా, కస్టమర్లు ఆన్‌లైన్‌లో సేవ్ అవుతాయి
• వేరే ఫోన్‌లో అదే ఈమెయిల్‌తో లాగిన్ అయితే అన్నీ వస్తాయి

→ దుకాణం డేటా సురక్షితంగా ఉండాలంటే లాగిన్ అయి Pro వాడండి.`,
          hi: `बिना खाते के:
• सब कुछ सिर्फ़ इस फ़ोन में। ऐप हटाने या ब्राउज़र डेटा साफ़ करने पर मिट जाएगा।

Pro या होलसेल के साथ:
• सामान, बिल, खाता और ग्राहक ऑनलाइन सेव होते हैं
• दूसरे फ़ोन पर उसी ईमेल से लॉगिन करें तो सब मिल जाएगा

→ दुकान का डेटा सुरक्षित रखने के लिए लॉगिन करें और Pro लें।`,
        },
      },
    ],
  },
]
