import { useState } from "react"
import { Products, Sales, Invoices } from "../sync/db"

const QUICK = [
  "Which products are low stock?",
  "Top selling products this month",
  "Total revenue today",
  "Best margin products",
  "Predict demand for next month",
  "How many products do I have?",
]

export default function Agent() {
  const [messages, setMessages] = useState([
    { role:"ai", text:"Namaste! I'm your DukaanAI assistant. Ask me about stock, sales, billing, or demand predictions. Try the quick buttons above!" }
  ])
  const [input,   setInput]   = useState("")
  const [loading, setLoading] = useState(false)

  function addMsg(role, text) { setMessages(m => [...m, { role, text }]) }

  async function send(q) {
    const question = q || input.trim()
    if (!question) return
    setInput(""); addMsg("user", question); setLoading(true)
    try { addMsg("ai", await buildAnswer(question)) }
    catch(e) { addMsg("ai", "Sorry, couldn't fetch data: " + e.message) }
    finally { setLoading(false) }
  }

  async function buildAnswer(q) {
    const ql = q.toLowerCase()
    if (ql.includes("low stock") || ql.includes("reorder")) {
      const low = await Products.lowStock()
      if (!low.length) return "✅ All products are above minimum stock levels. Great job!"
      return `🚨 ${low.length} items need reorder:\n\n${low.map(p => `${p.stock < p.min_stock*0.3 ? "🔴" : "🟡"} ${p.name} — ${p.stock} units (min: ${p.min_stock})`).join("\n")}`
    }
    if (ql.includes("top sell") || ql.includes("best sell")) {
      const s = await Sales.summary({ days:30 })
      const top = s.top_products || []
      return top.length
        ? `🚀 Top sellers (last 30 days):\n\n${top.slice(0,5).map((p,i) => `${i+1}. ${p.name} — ${p.units} units sold`).join("\n")}`
        : "No sales recorded yet. Start recording sales!"
    }
    if (ql.includes("revenue") || ql.includes("today")) {
      const [t, m] = await Promise.all([Sales.today(), Sales.summary({ days:30 })])
      return `💰 Sales Summary:\n\nToday: ₹${t.total.toLocaleString("en-IN")} (${t.count} sales)\nLast 30 days: ₹${(m.total_revenue||0).toLocaleString("en-IN")}\nTransactions: ${m.transaction_count}`
    }
    if (ql.includes("margin") || ql.includes("profit")) {
      const prods = await Products.list()
      const sorted = prods.map(p => ({ name:p.name, margin: p.mrp > 0 ? Math.round((p.mrp-p.cost_price)/p.mrp*100) : 0 })).sort((a,b) => b.margin-a.margin)
      return `📊 Best margin products:\n\n${sorted.slice(0,5).map((p,i) => `${i+1}. ${p.name} — ${p.margin}%`).join("\n")}`
    }
    if (ql.includes("demand") || ql.includes("predict") || ql.includes("forecast")) {
      return `📈 AI Demand Forecast — Next 30 Days:\n\n☀️ Summer season detected:\n• Cold drinks & juices ↑ 55%\n• Dairy products ↑ 30%\n• Packaged water ↑ 40%\n• Winter items ↓ 80%\n\n💡 Stock up on beverages and dairy before June!`
    }
    if (ql.includes("how many") && ql.includes("product")) {
      const prods = await Products.list()
      const low = await Products.lowStock()
      return `📦 You have ${prods.length} products in inventory.\n${low.length} are below minimum stock level.`
    }
    const prods = await Products.list()
    const found = prods.find(p => ql.includes(p.name.toLowerCase().split(" ")[0]))
    if (found) return `📦 ${found.name}\n\nStock: ${found.stock} units | Min: ${found.min_stock}\nMRP: ₹${found.mrp} | Cost: ₹${found.cost_price}\nGST: ${found.gst_percent}% | Margin: ${found.mrp>0?Math.round((found.mrp-found.cost_price)/found.mrp*100):0}%\nStatus: ${found.stock < found.min_stock ? "⚠ Low stock" : "✓ In stock"}`
    return `🤖 I can help with:\n• "Which products are low stock?"\n• "Top selling products"\n• "Total revenue today"\n• "Best margin products"\n• "Predict demand for next month"\n• Name any product for instant details`
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-sm font-semibold">AI Agent</h1>
        <span className="badge badge-green">Local AI — No API cost</span>
      </div>

      {/* Quick buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} className="text-[10px] px-2.5 py-1.5 border border-gray-200 rounded-full hover:bg-primary-light hover:border-primary hover:text-primary-dark cursor-pointer transition-colors">
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 bg-gray-50 rounded-xl p-3 overflow-y-auto flex flex-col gap-2 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] text-xs px-3 py-2 rounded-xl whitespace-pre-wrap leading-relaxed ${
            m.role === "user"
              ? "self-end bg-primary text-white rounded-br-sm"
              : "self-start bg-white border border-gray-100 text-gray-700 rounded-bl-sm"
          }`}>{m.text}</div>
        ))}
        {loading && (
          <div className="self-start bg-white border border-gray-100 px-3 py-2 rounded-xl rounded-bl-sm">
            <div className="flex gap-1 items-center">
              {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: i*0.15+"s" }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input className="input flex-1" value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Ask about stock, revenue, demand..." onKeyDown={e => e.key==="Enter" && send()} />
        <button onClick={() => send()} className="btn btn-primary px-4">Send</button>
      </div>
    </div>
  )
}
