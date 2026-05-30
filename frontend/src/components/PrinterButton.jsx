import { useState, useEffect } from "react"
import { printer } from "../utils/thermalPrinter.js"
import { useAuth } from "../context/AuthContext.jsx"

// ── PrinterButton ─────────────────────────────────────────────
// Drop-in button that handles connect + print in one tap.
// Props:
//   invoice   — the invoice object to print
//   size      — "sm" | "md" (default "md")
//   label     — override button label
export default function PrinterButton({ invoice, size = "md", label }) {
  const { vendor } = useAuth()
  const [state,     setState]     = useState("idle")   // idle | connecting | printing | done | error | unsupported
  const [devName,   setDevName]   = useState("")
  const [errMsg,    setErrMsg]    = useState("")
  const [connected, setConnected] = useState(false)

  // Sync with shared printer singleton
  useEffect(() => {
    setConnected(printer.connected)
    printer.onConnect    = () => { setConnected(true);  setDevName(printer.device?.name || "Printer") }
    printer.onDisconnect = () => { setConnected(false); setDevName("") }
    return () => { printer.onConnect = null; printer.onDisconnect = null }
  }, [])

  if (!printer.supported) return (
    <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", padding: "4px 8px" }}>
      🖨 Bluetooth print requires Chrome
    </div>
  )

  async function handlePress() {
    if (state === "printing" || state === "connecting") return

    // ── Step 1: connect if not already ───────────────────────
    if (!connected) {
      setState("connecting")
      setErrMsg("")
      try {
        const name = await printer.connect()
        setDevName(name)
        setState("idle")
      } catch (e) {
        setState("error")
        setErrMsg(e.message)
        setTimeout(() => setState("idle"), 4000)
        return
      }
    }

    // ── Step 2: print ─────────────────────────────────────────
    setState("printing")
    try {
      await printer.printInvoice(
        invoice,
        vendor?.store_name || "DukaanAI",
        {
          width:   32,
          address: vendor?.address  || "",
          phone:   vendor?.phone    || "",
          gstin:   vendor?.gstin    || "",
        }
      )
      setState("done")
      setTimeout(() => setState("idle"), 2500)
    } catch (e) {
      setState("error")
      setErrMsg(e.message)
      setTimeout(() => setState("idle"), 4000)
    }
  }

  const sm = size === "sm"
  const pad    = sm ? "6px 12px"  : "9px 18px"
  const fsize  = sm ? 11          : 13
  const radius = sm ? 8           : 10

  const bg = {
    idle:       connected ? "#1D9E75" : "var(--bg2,#f5f5f5)",
    connecting: "#f59e0b",
    printing:   "#1D9E75",
    done:       "#059669",
    error:      "#dc2626",
    unsupported:"#e5e7eb",
  }[state]

  const color = {
    idle:       connected ? "#fff"    : "var(--ink-dim,#555)",
    connecting: "#fff",
    printing:   "#fff",
    done:       "#fff",
    error:      "#fff",
    unsupported:"#9ca3af",
  }[state]

  const border = !connected && state === "idle" ? "1px solid var(--rule,#e0e0e0)" : "none"

  const content = {
    idle:       label || (connected ? `🖨 Print · ${devName}` : "🖨 Connect Printer"),
    connecting: "⏳ Connecting…",
    printing:   "🖨 Printing…",
    done:       "✓ Printed!",
    error:      "✗ " + (errMsg.slice(0, 28) || "Error"),
  }[state]

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button
        onClick={handlePress}
        disabled={state === "connecting" || state === "printing"}
        style={{
          padding: pad, borderRadius: radius, border, background: bg, color,
          fontSize: fsize, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.2s", opacity: (state === "connecting" || state === "printing") ? 0.8 : 1,
          boxShadow: connected && state === "idle" ? "0 2px 8px rgba(29,158,117,0.3)" : "none",
          whiteSpace: "nowrap",
        }}>
        {state === "printing" && (
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }}/>
        )}
        {content}
      </button>

      {/* Disconnect link — shown only when connected and idle */}
      {connected && state === "idle" && (
        <button
          onClick={() => { printer.disconnect(); setConnected(false); setDevName("") }}
          style={{
            background: "none", border: "none", fontSize: 9,
            color: "var(--ink-faint,#aaa)", cursor: "pointer", padding: 0,
          }}>
          Disconnect
        </button>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
