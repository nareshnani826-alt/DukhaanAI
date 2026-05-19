import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { PlanContext } from "../context/PlanContext";
import { i18n, LANG_KEY } from "../voice/i18n";

// ── Language quick-chips (10 languages) ──────────────────────────────────────
const CHIPS_BY_LANG = {
  "en-IN": ["Check my stock", "Today's sales", "Low stock items", "Udhaar dues", "Top sellers"],
  "te-IN": ["స్టాక్ చెక్ చేయి", "ఈరోజు అమ్మకాలు", "తక్కువ స్టాక్", "ఉధార్ బాకీలు", "బెస్ట్ సెల్లర్స్"],
  "hi-IN": ["स्टॉक चेक करो", "आज की बिक्री", "कम स्टॉक", "उधार बकाया", "टॉप सेलर्स"],
  "ta-IN": ["ஸ்டாக் பார்", "இன்றைய விற்பனை", "குறைந்த ஸ்டாக்", "கடன் நிலுவை", "டாப் செல்லர்ஸ்"],
  "kn-IN": ["ಸ್ಟಾಕ್ ಚೆಕ್ ಮಾಡು", "ಇಂದಿನ ಮಾರಾಟ", "ಕಡಿಮೆ ಸ್ಟಾಕ್", "ಉಧಾರ್ ಬಾಕಿ", "ಟಾಪ್ ಸೆಲ್ಲರ್ಸ್"],
  "ml-IN": ["സ്റ്റോക്ക് നോക്കൂ", "ഇന്നത്തെ വിൽപ്പന", "കുറഞ്ഞ സ്റ്റോക്ക്", "കടം ബാക്കി", "ടോപ് സെല്ലേഴ്സ്"],
  "mr-IN": ["स्टॉक तपासा", "आजची विक्री", "कमी स्टॉक", "उधार थकबाकी", "टॉप सेलर्स"],
  "bn-IN": ["স্টক চেক করো", "আজকের বিক্রয়", "কম স্টক", "উধার বকেয়া", "টপ সেলার"],
  "gu-IN": ["સ્ટોક ચેક કરો", "આજનું વેચાણ", "ઓછો સ્ટોક", "ઉધાર બાકી", "ટોપ સેલર્સ"],
  "pa-IN": ["ਸਟਾਕ ਚੈੱਕ ਕਰੋ", "ਅੱਜ ਦੀ ਵਿਕਰੀ", "ਘੱਟ ਸਟਾਕ", "ਉਧਾਰ ਬਕਾਇਆ", "ਟਾਪ ਸੇਲਰ"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL;

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Decide which store data to fetch based on question keywords
function needsUdhar(q) { return /udh|khata|due|baki|bakaya|baaki|கடன்|ఉధార్|उधार/i.test(q); }
function needsWastage(q) { return /wast|expire|damage|nashan|waste/i.test(q); }

export default function Agent() {
  const { token } = useContext(AuthContext);
  const { plan } = useContext(PlanContext);

  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en-IN");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "నమస్కారం! 👋 I'm your DukaanAI Shop Assistant.\n\nI can see your live inventory, sales, and udhaar. Ask me anything!",
      time: timestamp(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chipsUsed, setChipsUsed] = useState(false);
  const msgsRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, loading]);

  // Persist language choice
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // ── Fetch store context ───────────────────────────────────────────────────
  async function fetchStoreContext(question) {
    const headers = { Authorization: `Bearer ${token}` };
    const ctx = {};

    try {
      // Always fetch products + sales
      const [prodRes, salesRes, invoiceRes] = await Promise.all([
        fetch(`${API}/api/products?limit=1000`, { headers }),
        fetch(`${API}/api/sales/summary`, { headers }),
        fetch(`${API}/api/invoices?limit=20`, { headers }),
      ]);
      ctx.products = prodRes.ok ? await prodRes.json() : [];
      ctx.sales = salesRes.ok ? await salesRes.json() : {};
      ctx.invoices = invoiceRes.ok ? await invoiceRes.json() : [];

      // Conditional fetches
      if (needsUdhar(question)) {
        const [ucRes, utRes] = await Promise.all([
          fetch(`${API}/api/udhar/customers`, { headers }),
          fetch(`${API}/api/udhar/transactions?limit=50`, { headers }),
        ]);
        ctx.udhar_customers = ucRes.ok ? await ucRes.json() : [];
        ctx.udhar_transactions = utRes.ok ? await utRes.json() : [];
      }
      if (needsWastage(question)) {
        const wRes = await fetch(`${API}/api/wastage?limit=50`, { headers });
        ctx.wastage = wRes.ok ? await wRes.json() : [];
      }
    } catch (e) {
      console.error("Context fetch error:", e);
    }
    return ctx;
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setChipsUsed(true);

    const userMsg = { id: Date.now(), role: "user", text: q, time: timestamp() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const storeContext = await fetchStoreContext(q);

      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: q,
          language: lang,
          store_context: storeContext,
        }),
      });

      const data = res.ok ? await res.json() : null;
      const reply = data?.response || data?.reply || data?.message || "Sorry, I couldn't get a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: reply, time: timestamp() },
      ]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: "⚠️ Connection error. Please check your internet and try again.", time: timestamp() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const chips = CHIPS_BY_LANG[lang] || CHIPS_BY_LANG["en-IN"];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg1, #f7f4f2)" }}>

      {/* ── Header ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: "var(--saffron, #e87722)", minHeight: 60 }}
      >
        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full text-xl flex-shrink-0"
          style={{
            width: 40, height: 40,
            background: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.35)",
          }}
        >
          🤖
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">Shop Assistant</p>
          <p className="text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.85)" }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#a3f0c4" }} />
            Online · AI powered
          </p>
        </div>

        {/* Language selector */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="text-xs rounded-full px-3 py-1 border-0 font-medium cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.9)",
            color: "var(--saffron, #e87722)",
            outline: "none",
          }}
        >
          <option value="en-IN">English</option>
          <option value="te-IN">తెలుగు</option>
          <option value="hi-IN">हिंदी</option>
          <option value="ta-IN">தமிழ்</option>
          <option value="kn-IN">ಕನ್ನಡ</option>
          <option value="ml-IN">മലയാളം</option>
          <option value="mr-IN">मराठी</option>
          <option value="bn-IN">বাংলা</option>
          <option value="gu-IN">ગુજરાતી</option>
          <option value="pa-IN">ਪੰਜਾਬੀ</option>
        </select>
      </div>

      {/* ── Messages ── */}
      <div
        ref={msgsRef}
        className="flex-1 overflow-y-auto flex flex-col gap-2 px-3 py-3"
        style={{ background: "var(--bg1, #f7f4f2)" }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            {msg.role === "assistant" && (
              <div
                className="flex items-center justify-center rounded-full text-sm flex-shrink-0"
                style={{
                  width: 30, height: 30,
                  background: "var(--saffron, #e87722)",
                  color: "white",
                  fontSize: 14,
                }}
              >
                🤖
              </div>
            )}

            {/* Bubble */}
            <div style={{ maxWidth: "78%" }}>
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  padding: "10px 13px",
                  borderRadius: msg.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                  background: msg.role === "user"
                    ? "var(--saffron, #e87722)"
                    : "var(--bg0, #ffffff)",
                  color: msg.role === "user" ? "white" : "var(--ink, #1a1a1a)",
                  boxShadow: msg.role === "user"
                    ? "0 1px 4px rgba(232,135,34,0.25)"
                    : "0 1px 4px rgba(0,0,0,0.07)",
                  border: msg.role === "assistant" ? "0.5px solid var(--border, #e5ddd7)" : "none",
                }}
              >
                {msg.text}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--ink3, #bbb)", textAlign: msg.role === "user" ? "right" : "left" }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 30, height: 30, background: "var(--saffron, #e87722)", color: "white", fontSize: 14 }}
            >
              🤖
            </div>
            <div
              className="flex items-center gap-1"
              style={{
                padding: "12px 14px",
                borderRadius: "16px 16px 16px 4px",
                background: "var(--bg0, #ffffff)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                border: "0.5px solid var(--border, #e5ddd7)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: 7, height: 7,
                    borderRadius: "50%",
                    background: "var(--saffron, #e87722)",
                    animation: `dukaanTyping 1.1s infinite`,
                    animationDelay: `${i * 0.18}s`,
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick chips — show only at start */}
        {!chipsUsed && (
          <div className="flex flex-wrap gap-2 mt-1">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => send(chip)}
                className="text-xs font-medium rounded-full px-3 py-1.5 transition-all"
                style={{
                  background: "var(--bg0, white)",
                  border: "1.5px solid var(--saffron, #e87722)",
                  color: "var(--saffron, #e87722)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--saffron, #e87722)";
                  e.target.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg0, white)";
                  e.target.style.color = "var(--saffron, #e87722)";
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Input row ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          background: "var(--bg0, #ffffff)",
          borderTop: "0.5px solid var(--border, #e5ddd7)",
        }}
      >
        {/* Input wrap */}
        <div
          className="flex items-center flex-1 gap-2 rounded-full px-3"
          style={{
            background: "var(--bg1, #f7f4f2)",
            border: "0.5px solid var(--border, #e5ddd7)",
            minHeight: 40,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-0 outline-none text-sm py-2"
            style={{ color: "var(--ink, #1a1a1a)", fontFamily: "inherit" }}
            disabled={loading}
          />
          {/* Mic inside input */}
          <button
            className="flex items-center justify-center flex-shrink-0"
            style={{
              background: "none",
              border: "none",
              color: "var(--saffron, #e87722)",
              fontSize: 18,
              cursor: "pointer",
              padding: "2px 0",
            }}
            title="Voice input"
            aria-label="Voice input"
            onClick={() => {
              // Hook into existing voice engine if needed
              // For now navigates user to Voice page or triggers browser mic
              if (window.SpeechRecognition || window.webkitSpeechRecognition) {
                const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                const rec = new SR();
                rec.lang = lang;
                rec.onresult = (e) => setInput(e.results[0][0].transcript);
                rec.start();
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="9" y1="22" x2="15" y2="22"/>
            </svg>
          </button>
        </div>

        {/* Send button */}
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-opacity"
          style={{
            width: 40, height: 40,
            background: "var(--saffron, #e87722)",
            border: "none",
            color: "white",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {/* Powered by */}
      <p
        className="text-center py-1 flex-shrink-0"
        style={{ fontSize: 10, color: "var(--ink3, #ccc)", background: "var(--bg0, white)" }}
      >
        Powered by Claude AI · Reads your live inventory data
      </p>

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes dukaanTyping {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
