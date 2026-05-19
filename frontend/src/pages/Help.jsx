import { useState } from "react"

const SECTIONS = [
  {
    id: "getting-started",
    icon: "🚀",
    title: "Getting Started",
    color: "var(--jade)",
    bg: "#E1F5EE",
    articles: [
      {
        title: "What is DukaanAI?",
        content: `DukaanAI is a smart inventory and billing system built specifically for Indian kirana shops, grocery stores, and wholesale vendors.

It helps you:
• Track your stock levels in real time
• Generate GST invoices instantly
• Accept voice commands in Telugu, Hindi, Tamil and 7 more Indian languages
• Track customer purchase history
• Monitor daily profit and stock at day open/close
• Get low stock alerts before you run out

You can use DukaanAI completely free on one device with local storage, or upgrade to Pro for cloud sync across multiple devices.`
      },
      {
        title: "How to login and set up your store",
        content: `1. Open the app and click "Login / Register" in the sidebar
2. Click the Register tab
3. Enter your store name, email, phone and password
4. Click Create Account
5. You're logged in! Your store name will appear in the sidebar.

Free plan stores data only on your device. Pro plan syncs to the cloud so you can access from any phone or computer.

Tip: Use your shop's WhatsApp number as the phone — invoices will be sent from there.`
      },
      {
        title: "Free vs Pro vs Wholesale plans",
        content: `Free Plan (₹0):
• Basic inventory management
• GST billing (5 invoices/day)
• WhatsApp invoice sharing
• Dashboard
• Local storage only (one device)

Pro Plan (₹299/month):
• Everything in Free
• Unlimited invoices
• Cloud sync (access from any device)
• Voice agent (10 Indian languages)
• Barcode scanner
• Customer history
• Day open/close with profit report
• Insights and GST reports
• Low stock alerts

Wholesale Plan (₹799/month):
• Everything in Pro
• Multi-staff login (owner, manager, cashier)
• AI image product scanner
• Staff audit log
• Bulk data export

Go to Settings to see your current plan and upgrade.`
      },
    ]
  },
  {
    id: "inventory",
    icon: "📦",
    title: "Inventory Management",
    color: "#378ADD",
    bg: "#E6F1FB",
    articles: [
      {
        title: "How to add products",
        content: `Method 1 — Manual:
1. Go to Inventory page
2. Click "+ Add Product" button
3. Fill in: Product name, Category, Stock quantity, MRP price, Cost price, GST %
4. Click Add Product

Method 2 — Voice (Pro):
1. Select your language (Telugu, Hindi etc.) in the top right dropdown
2. Click the mic icon 🎤 next to the product name field
3. Say the product name — e.g. "Tata Salt ek kilo" or "అమూల్ మిల్క్ 500ml"
4. The system auto-detects the unit (kg/litre/piece) from the name

Auto unit detection:
• "Tata Salt 1kg" → unit set to kg automatically
• "Amul Milk 500ml" → unit set to ml automatically
• "Parle-G Biscuits" → unit set to piece automatically`
      },
      {
        title: "Barcode generation and scanning",
        content: `Generate barcodes for your products:
1. Go to Inventory
2. Find any product → click "Generate" in the Barcode column
3. A barcode is auto-created from the product ID
4. Choose how many labels to print (1 to 50)
5. Click "Print labels" → a print page opens → print on any printer
6. Cut and stick labels on your shelves or product packets
7. Click "Save barcode to product" → product is now scan-ready (shows ✓ Barcode)

Scan during billing:
• In GST Billing → type barcode number in the search bar → press Enter → product appears
• Or use a USB barcode scanner (₹500–800 on Amazon) → it types automatically

For branded products (Tata Salt, Amul etc.) that already have printed barcodes:
• Edit the product → set SKU to the barcode number printed on the packet
• Example: Tata Salt 1kg barcode is 8901030812018`
      },
      {
        title: "Low stock alerts",
        content: `Every product has a minimum stock level (Min Stock). When stock falls below this, the product shows as "Low stock" or "Critical".

Setting minimum stock:
• Add/edit a product → set "Min Stock (reorder at)" field
• Example: if you want to reorder Tata Salt when you have less than 10 packets, set Min Stock = 10

Where you see alerts:
• Dashboard → Reorder Alerts card shows all low stock items
• Day Ops → Close Day shows a full list with WhatsApp send option
• Inventory table → color bar turns red/yellow when low

Send reorder list via WhatsApp:
• Day Ops → Close Day → tap "Send Reorder List on WhatsApp"
• Your supplier gets a formatted message with all items that need restocking`
      },
    ]
  },
  {
    id: "billing",
    icon: "🧾",
    title: "GST Billing",
    color: "#EF9F27",
    bg: "#FAEEDA",
    articles: [
      {
        title: "How to generate a GST invoice",
        content: `1. Go to GST Billing page
2. Search for a product in the barcode/product search bar at the top
3. Click "+ Add item" if you want to add manually from the dropdown
4. Fill in customer name (required)
5. Add customer phone number for WhatsApp sharing
6. Select payment mode: Cash, UPI, Credit, or Cheque
7. Click "Generate Invoice"
8. Invoice appears on the right with invoice number, GST breakdown, total

GST is calculated automatically:
• CGST = half of the product's GST %
• SGST = other half
• Example: Product with 5% GST → 2.5% CGST + 2.5% SGST

Invoice numbers are sequential: INV-0001, INV-0002 etc.`
      },
      {
        title: "Sending invoices on WhatsApp",
        content: `After generating an invoice:
1. Enter the customer's mobile number in the "Phone" field
2. Generate the invoice
3. Click the green "Send on WhatsApp" button
4. WhatsApp opens with the invoice pre-formatted as a message
5. If you entered the phone number → opens direct chat with that customer
6. If no number → opens WhatsApp for you to select a contact

The invoice message includes:
• Your store name and GSTIN
• Invoice number and date
• All items with quantities and prices
• CGST and SGST breakdown
• Grand total
• "Thank you for shopping" message

You can also resend old invoices from the Customers page.`
      },
      {
        title: "Credit sales and payment tracking",
        content: `For customers who pay later (credit/udhar):
1. Select "Credit" as the payment mode when generating invoice
2. The invoice is saved as usual
3. Customer's total spent is tracked in Customers page

Currently DukaanAI tracks credit at the invoice level. A full credit/udhar ledger feature is on the roadmap.

Tip: Use the Notes field in Customer profile (Customers → select customer → Edit) to note credit arrangements. Example: "Weekly settlement every Saturday" or "Pays ₹500 advance monthly".`
      },
    ]
  },
  {
    id: "voice",
    icon: "🎤",
    title: "Voice Agent",
    color: "var(--jade)",
    bg: "#E1F5EE",
    articles: [
      {
        title: "Supported languages",
        content: `DukaanAI supports voice in 10 Indian languages:
• తెలుగు (Telugu)
• हिंदी (Hindi)
• தமிழ் (Tamil)
• ಕನ್ನಡ (Kannada)
• മലയാളം (Malayalam)
• मराठी (Marathi)
• বাংলা (Bengali)
• ગુજરાતી (Gujarati)
• ਪੰਜਾਬੀ (Punjabi)
• English

The app uses your device's built-in speech recognition (free, no API cost) and translates to English automatically before processing.

Important: Voice works best on Android Chrome or Desktop Chrome/Edge. On iPhone, use Safari and allow microphone in Settings → Safari → Microphone.`
      },
      {
        title: "Voice commands and examples",
        content: `Adding to bill:
• "Dus kilo chawal bill mein daalo" (Hindi)
• "కిలో టమాటలు బిల్లు ఆడ్ చేయండి" (Telugu)
• "Pathu kilo arisi bill la seer" (Tamil)
• "5 packet Maggi add to bill"

Adding stock:
• "Tata Salt 10 kilo aaya" (stock received)
• "Amul Milk 50 packets vacchindi" (Telugu)
• "Received 20 litres Fortune oil"

Checking stock:
• "Tata Salt kitna bacha?" (Hindi)
• "Amul Milk stock enta?" (Telugu)
• "How many Maggi packets left?"

The app always shows a confirmation card before taking action. Review and tap Confirm to proceed, or Cancel to try again.`
      },
      {
        title: "Voice troubleshooting",
        content: `"Voice error" appears:
→ Make sure microphone permission is allowed in browser settings
→ Click the lock icon in browser address bar → Microphone → Allow
→ Reload the page and try again

Product not recognized:
→ Say the brand name clearly: "Tata Salt" not just "salt"
→ The product must exist in your inventory or in our known products database
→ Random phrases are rejected — always say a product name

Wrong product added:
→ The confirmation card shows before any action
→ Always review the Product, Quantity and Action shown
→ Tap Cancel if anything is wrong

Voice adds duplicate instead of updating:
→ If a product already exists in inventory, voice will update its stock
→ If it creates a new one, the product name didn't match — check spelling in Inventory

iPhone not working:
→ iOS Chrome cannot do voice (Apple limitation)
→ Use Safari on iPhone: Settings → Safari → Microphone → Allow`
      },
    ]
  },
  {
    id: "dayops",
    icon: "📅",
    title: "Day Open / Close",
    color: "#7F77DD",
    bg: "#EEEDFE",
    articles: [
      {
        title: "How Day Open/Close works",
        content: `Day Open:
1. Go to Day Ops page (or tap "Open Day" on the auto-prompt that appears after login)
2. Click "Open Day Now"
3. A snapshot of all your stock levels and costs is saved — this is your opening stock
4. The opening sound plays (rising chime)
5. During the day, sell normally — the table shows opening stock vs current stock in real time

Day Close:
1. At end of day, go to Day Ops
2. Click "Close Day"
3. The system calculates:
   • Total sales for the day
   • Number of invoices generated
   • Gross profit (revenue minus cost of goods sold)
   • Profit margin %
   • All stock movements — what was sold, what remains
4. Low stock alerts appear with a WhatsApp button to send reorder list
5. Closing sound plays (descending bell)

The day open/close session saves to the cloud (Pro) or local storage (Free).`
      },
      {
        title: "Understanding the profit calculation",
        content: `Gross Profit = Revenue - Cost of Goods Sold (COGS)

Example:
• You sold 10kg Tata Salt at ₹28/kg = ₹280 revenue
• Your cost price was ₹22/kg → COGS = ₹220
• Gross Profit = ₹280 - ₹220 = ₹60

This is calculated automatically at day close using:
• Opening stock snapshot (cost prices at start of day)
• Sales records for the day
• Current stock levels

Profit margin % = (Gross Profit / Total Revenue) × 100

Important: This is gross profit only. It does not include fixed costs like rent, electricity, salaries.

To improve profit: regularly update your Cost Price in Inventory to reflect current purchase prices. The profit calculation uses whatever cost price is saved in each product.`
      },
    ]
  },
  {
    id: "customers",
    icon: "👥",
    title: "Customer History",
    color: "#D4537E",
    bg: "#FBEAF0",
    articles: [
      {
        title: "How customers are saved",
        content: `Automatic saving:
Every time you generate an invoice with a customer name and phone number, the customer is automatically saved or updated in the Customers page. No manual entry needed.

The system tracks:
• Customer name and phone
• Total amount spent (all time)
• Number of visits
• Last purchase date
• Full invoice history

Manual adding:
You can also add customers before they make a purchase:
1. Go to Customers page
2. Click "+ Add Customer"
3. Fill in name, phone, GSTIN (for business customers), address, and notes
4. Click Add Customer

The Notes field is very useful — write things like "Credit customer", "Pays every Saturday", "Business owner — needs GST invoice always".`
      },
      {
        title: "Resending invoices on WhatsApp",
        content: `To resend any past invoice:
1. Go to Customers page
2. Click on the customer name
3. Their full invoice history appears on the right
4. Find the invoice you want to resend
5. Click "Resend WhatsApp" button
6. WhatsApp opens with the complete invoice message

The resent invoice includes all original details:
invoice number, date, all items, GST breakdown, total.

To start a WhatsApp chat with a customer directly:
• Click the green "WhatsApp" button on the customer card
• Opens WhatsApp chat with that number (you can send any message)`
      },
    ]
  },
  {
    id: "settings",
    icon: "⚙️",
    title: "Settings & Plans",
    color: "#888780",
    bg: "#F1EFE8",
    articles: [
      {
        title: "Managing features in Settings",
        content: `Go to Settings to control which features are active:

For each feature you can:
• Toggle ON → feature is fully active
• Toggle OFF → feature is disabled and locked (you'll see a "turned off" screen if you try to access it)
• Click Enable → turns a disabled feature back on instantly

Features available per plan:
• Pro: Voice Agent, Barcode Scanner, Customer History, Day Ops, Insights, Low Stock Alerts, Cloud Sync
• Wholesale: Everything in Pro + Multi-staff Login, AI Image Scanner, Audit Log

Why would you turn off a feature?
• Simplify the interface for staff who don't need all features
• Prevent cashiers from accessing sensitive areas like Insights
• Disable voice agent on devices without microphone support

Turning a feature off doesn't delete any data — just hides the page.`
      },
      {
        title: "Cloud sync explained",
        content: `Cloud sync (Pro and Wholesale plans) means your data is stored in Supabase — a secure cloud database — and accessible from any device.

What syncs to the cloud:
• All products and stock levels
• All sales and invoices
• All customer history
• Day session records

What stays local only:
• Feature toggle preferences (per device)
• Login session (JWT token)
• Day open prompt (per day, per device)

To access from another device:
1. Open DukaanAI on any device
2. Login with the same email and password
3. All your data loads from the cloud automatically

Free plan users: data is stored only in the browser's localStorage on one device. Clearing browser data or switching devices will lose data. Upgrade to Pro to protect your data in the cloud.`
      },
    ]
  },
]

export default function Help() {
  const [activeSection, setActiveSection] = useState("getting-started")
  const [activeArticle, setActiveArticle] = useState(0)
  const [search, setSearch] = useState("")

  const filtered = search
    ? SECTIONS.map(s => ({
        ...s,
        articles: s.articles.filter(a =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.content.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.articles.length > 0)
    : SECTIONS

  const currentSection = SECTIONS.find(s => s.id === activeSection)
  const currentArticle = currentSection?.articles[activeArticle]

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold">Help & Documentation</h1>
          <p className="text-[10px] text-gray-400">Everything you need to know about DukaanAI</p>
        </div>
        <span className="badge badge-green">v1.0 Docs</span>
      </div>

      {/* Search */}
      <input className="input mb-4" placeholder="🔍 Search documentation..."
        value={search} onChange={e => { setSearch(e.target.value); setActiveArticle(0) }} />

      <div className="flex gap-3 flex-1 overflow-hidden min-h-0">

        {/* Left: sections + articles list */}
        <div className="w-56 flex-shrink-0 overflow-y-auto">
          {filtered.map(section => (
            <div key={section.id} className="mb-3">
              <button
                onClick={() => { setActiveSection(section.id); setActiveArticle(0) }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all text-xs font-semibold ${
                  activeSection === section.id && !search
                    ? "text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                style={activeSection === section.id && !search ? { background: section.color } : {}}>
                <span>{section.icon}</span>
                {section.title}
              </button>

              <div className="ml-2 mt-1 space-y-0.5">
                {section.articles.map((article, idx) => (
                  <button key={idx}
                    onClick={() => { setActiveSection(section.id); setActiveArticle(idx) }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                      activeSection === section.id && activeArticle === idx
                        ? "font-medium"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                    style={activeSection === section.id && activeArticle === idx
                      ? { color: section.color, background: section.bg }
                      : {}}>
                    {article.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: article content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {search && filtered.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm font-medium text-gray-500">No results for "{search}"</div>
              <div className="text-xs text-gray-400 mt-1">Try different keywords</div>
            </div>
          ) : search ? (
            // Search results view
            <div className="space-y-3">
              {filtered.map(section => section.articles.map((article, idx) => (
                <div key={`${section.id}-${idx}`} className="card cursor-pointer hover:border-gray-200 transition-all"
                  onClick={() => { setActiveSection(section.id); setActiveArticle(idx); setSearch("") }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{section.icon}</span>
                    <span className="text-[10px] font-medium" style={{ color: section.color }}>{section.title}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mb-1">{article.title}</div>
                  <div className="text-[11px] text-gray-500 line-clamp-2">
                    {article.content.slice(0, 120)}...
                  </div>
                </div>
              )))}
            </div>
          ) : currentArticle ? (
            <div className="card">
              {/* Article header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: currentSection?.bg }}>
                  {currentSection?.icon}
                </div>
                <div>
                  <div className="text-[10px] font-medium mb-0.5" style={{ color: currentSection?.color }}>
                    {currentSection?.title}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{currentArticle.title}</div>
                </div>
              </div>

              {/* Article body */}
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                {currentArticle.content.split("\n").map((line, i) => {
                  if (line.startsWith("•")) {
                    return (
                      <div key={i} className="flex items-start gap-2 my-1">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{line.slice(1).trim()}</span>
                      </div>
                    )
                  }
                  if (line.match(/^\d+\./)) {
                    return (
                      <div key={i} className="flex items-start gap-2 my-1">
                        <span className="font-semibold text-gray-400 flex-shrink-0 w-4">{line.match(/^\d+/)[0]}.</span>
                        <span>{line.replace(/^\d+\./, "").trim()}</span>
                      </div>
                    )
                  }
                  if (line === "") return <div key={i} className="h-2" />
                  if (line.endsWith(":") && !line.startsWith(" ")) {
                    return <div key={i} className="font-semibold text-gray-800 mt-3 mb-1">{line}</div>
                  }
                  if (line.startsWith("→")) {
                    return (
                      <div key={i} className="flex items-start gap-2 my-1 text-primary-dark">
                        <span className="flex-shrink-0">→</span>
                        <span>{line.slice(1).trim()}</span>
                      </div>
                    )
                  }
                  return <div key={i} className="my-0.5">{line}</div>
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setActiveArticle(a => Math.max(0, a-1))}
                  disabled={activeArticle === 0}
                  className="btn btn-sm disabled:opacity-30">
                  ← Previous
                </button>
                <span className="text-[10px] text-gray-400 self-center">
                  {activeArticle+1} / {currentSection?.articles.length}
                </span>
                <button
                  onClick={() => setActiveArticle(a => Math.min((currentSection?.articles.length||1)-1, a+1))}
                  disabled={activeArticle === (currentSection?.articles.length||1)-1}
                  className="btn btn-sm disabled:opacity-30">
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
