// "🚩 Report" under an AI answer. Google Play requires apps with AI chat to let users
// flag offensive AI output without leaving the app. Sends the answer to POST /chat/report.
import { useState } from "react"
import { API_BASE, getToken } from "../sync/db"

const REASONS = ["Offensive or harmful", "Wrong information", "Other"]

export default function ReportAnswer({ question, answer }) {
  const [state, setState] = useState("idle")   // idle | pick | sending | done

  async function send(reason) {
    setState("sending")
    try {
      const token = getToken()
      await fetch(`${API_BASE}/chat/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ question: question || "", answer, reason }),
      })
    } catch {}
    setState("done")   // never leave the user stuck, even offline
  }

  const link = { background:"none", border:"none", padding:"2px 0", cursor:"pointer",
    fontSize:10, color:"var(--ink-faint, #999)" }

  if (state === "done") return <div style={{ ...link, cursor:"default" }}>✓ Reported — thank you</div>
  if (state === "sending") return <div style={{ ...link, cursor:"default" }}>Sending…</div>
  if (state === "pick") return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:3, alignItems:"center" }}>
      <span style={{ fontSize:10, color:"var(--ink-faint, #999)" }}>Why?</span>
      {REASONS.map(r => (
        <button key={r} onClick={() => send(r)}
          style={{ fontSize:10, padding:"2px 8px", borderRadius:10, cursor:"pointer",
            border:"1px solid var(--rule, #ddd)", background:"var(--bg0, #fff)", color:"var(--ink, #333)" }}>
          {r}
        </button>
      ))}
      <button onClick={() => setState("idle")} style={link}>Cancel</button>
    </div>
  )
  return <button onClick={() => setState("pick")} style={link} aria-label="Report this AI answer">🚩 Report</button>
}
