/**
 * DaySessionGate — startup modal that ensures the user opens/closes their daily session.
 *
 * On every first page load of the day it checks:
 *   1. Is there an unclosed session from a previous day?  → show "Close Yesterday" step
 *   2. Is today's session not yet opened?                 → show "Open Today" step
 *   3. Already open or closed today?                      → silent, no modal
 *
 * Snooze (1 h) and per-day "done" flags live in sessionStorage so the modal
 * never re-appears within the same browsing session once handled.
 *
 * Works for both:
 *   • Cloud (Pro/Wholesale) users → calls /day-sessions/pending + /open + /close-prev/:id
 *   • Free / local users          → reads/writes dk_day_session in localStorage
 */

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { api, isCloud, getToken } from "../sync/db"

const API = import.meta.env.VITE_API_URL ?? ""

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  })
}

// localStorage helpers for free-plan users
function getLocalSession() {
  try { return JSON.parse(localStorage.getItem("dk_day_session") || "null") } catch { return null }
}
function saveLocalSession(s) {
  try { localStorage.setItem("dk_day_session", JSON.stringify(s)) } catch {}
}
function closeLocalSession(session) {
  saveLocalSession({ ...session, status: "closed", closed_at: new Date().toISOString() })
}
function openLocalSession() {
  const session = {
    id:         "local-day-" + Date.now(),
    date:       new Date().toISOString().slice(0, 10),
    opened_at:  new Date().toISOString(),
    status:     "open",
    opening_stock: [],
  }
  saveLocalSession(session)
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DaySessionGate({ vendor }) {
  const [step,        setStep]        = useState(null)  // null | "close-prev" | "open-today"
  const [prevSession, setPrevSession] = useState(null)
  const [acting,      setActing]      = useState(false)
  const [error,       setError]       = useState("")

  const today    = new Date().toISOString().slice(0, 10)
  const doneKey  = `dk_gate_done_${today}`
  const snoozeKey = "dk_gate_snooze"

  useEffect(() => {
    if (!vendor) return
    // Skip bangle-only users — they manage day sessions via /bangle-day
    if (Array.isArray(vendor.modules) && vendor.modules.includes("bangle_fancy") && !vendor.modules.includes("kirana")) return
    if (sessionStorage.getItem(doneKey)) return

    const snoozeUntil = parseInt(sessionStorage.getItem(snoozeKey) || "0")
    if (Date.now() < snoozeUntil) return

    // Small delay so the app renders fully before showing the modal
    const timer = setTimeout(checkSessions, 1500)
    return () => clearTimeout(timer)
  }, [vendor])

  // End-of-day closing reminder: if still open after 6 PM, nudge once per hour
  useEffect(() => {
    if (!vendor) return
    // Skip bangle-only users — they manage day sessions via /bangle-day
    if (Array.isArray(vendor.modules) && vendor.modules.includes("bangle_fancy") && !vendor.modules.includes("kirana")) return
    const closeReminderKey = `dk_gate_close_remind_${today}`

    const check = async () => {
      const hour = new Date().getHours()
      if (hour < 18) return  // only after 6 PM
      if (sessionStorage.getItem(closeReminderKey)) return

      try {
        if (isCloud()) {
          const data = await api.get("/day-sessions/pending").catch(() => null)
          if (data?.today?.status === "open") {
            sessionStorage.setItem(closeReminderKey, "1")
            setStep("close-today")
          }
        } else {
          const s = getLocalSession()
          if (s && s.date === today && s.status === "open") {
            sessionStorage.setItem(closeReminderKey, "1")
            setStep("close-today")
          }
        }
      } catch {}
    }

    // Check once on mount (for late arrivals), then every hour
    const timer  = setTimeout(check, 2000)
    const hourly = setInterval(check, 60 * 60 * 1000)
    return () => { clearTimeout(timer); clearInterval(hourly) }
  }, [vendor])

  async function checkSessions() {
    try {
      if (isCloud()) {
        const data = await api.get("/day-sessions/pending").catch(() => null)
        if (!data) return

        if (data.unclosed_prev) {
          setPrevSession(data.unclosed_prev)
          setStep("close-prev")
        } else if (!data.today) {
          setStep("open-today")
        }
      } else {
        // Free / local plan
        const session = getLocalSession()
        if (session && session.date !== today && session.status === "open") {
          setPrevSession(session)
          setStep("close-prev")
        } else if (!session || session.date !== today) {
          setStep("open-today")
        }
      }
    } catch { /* offline or API down — don't bother user */ }
  }

  async function handleCloseToday() {
    setActing(true)
    setError("")
    try {
      if (isCloud()) {
        await api.post("/day-sessions/close", {})
      } else {
        const s = getLocalSession()
        if (s) closeLocalSession(s)
      }
      sessionStorage.setItem(doneKey, "1")
      setStep(null)
    } catch {
      setError("Could not close. Try the Day Ops page directly.")
    }
    setActing(false)
  }

  async function handleClosePrev() {
    setActing(true)
    setError("")
    try {
      if (isCloud()) {
        await api.post(`/day-sessions/close-prev/${prevSession.id}`, {})
      } else {
        closeLocalSession(prevSession)
      }
      setStep("open-today")
    } catch {
      setError("Could not close. Please try on the Day Ops page.")
    }
    setActing(false)
  }

  async function handleOpenDay() {
    setActing(true)
    setError("")
    try {
      if (isCloud()) {
        await api.post("/day-sessions/open", {})
      } else {
        openLocalSession()
      }
      sessionStorage.setItem(doneKey, "1")
      setStep(null)
    } catch {
      setError("Could not open. Try the Day Ops page directly.")
    }
    setActing(false)
  }

  function handleSkipPrev() {
    setStep("open-today")
  }

  function handleSnooze() {
    sessionStorage.setItem(snoozeKey, String(Date.now() + 60 * 60 * 1000))
    setStep(null)
  }

  function handleDismiss() {
    sessionStorage.setItem(doneKey, "1")
    setStep(null)
  }

  if (!step) return null

  const prevDateLabel = fmtDate(prevSession?.date || prevSession?.opened_at)

  const modal = (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom,0)",
      }}
      onClick={e => { if (e.target === e.currentTarget) handleSnooze() }}
    >
      <div style={{
        background: "var(--bg1,#ffffff)",
        borderRadius: "24px 24px 0 0",
        padding: "32px 24px 28px",
        width: "100%", maxWidth: 480,
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        animation: "dsGateSlideUp 0.28s cubic-bezier(.22,1,.36,1)",
      }}>

        {step === "close-today" ? (
          <>
            {/* ── Step: close today (end-of-day reminder) ─── */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>🌙</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink,#111)", marginBottom: 8 }}>
                Time to Close the Day
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-faint,#666)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: "var(--saffron,#e87722)" }}>
                  {fmtDate(today)}
                </span>
                {" "}is still open. Close it to record today's final profit, stock levels, and reorder alerts.
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 10,
                padding: "9px 13px", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleCloseToday}
                disabled={acting}
                style={{
                  padding: "15px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg,#185FA5,#2563eb)",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: acting ? "default" : "pointer",
                  opacity: acting ? 0.7 : 1,
                }}>
                {acting ? "Closing…" : "🌙 Close Today's Day"}
              </button>

              <button
                onClick={handleSnooze}
                style={{
                  padding: "12px", borderRadius: 12,
                  border: "1.5px solid var(--rule,#e5e7eb)",
                  background: "transparent",
                  color: "var(--ink-dim,#555)", fontSize: 12,
                  fontWeight: 600, cursor: "pointer",
                }}>
                ⏰ Remind me in 1 hour
              </button>
            </div>
          </>
        ) : step === "close-prev" ? (
          <>
            {/* ── Step 1: close previous unclosed day ──────── */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink,#111)", marginBottom: 8 }}>
                Previous Day Not Closed
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-faint,#666)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: "var(--saffron,#e87722)" }}>
                  {prevDateLabel}
                </span>{" "}
                was left open. Close it first so profit and stock data stays accurate.
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 10,
                padding: "9px 13px", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleClosePrev}
                disabled={acting}
                style={{
                  padding: "15px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg,#0F6E56,#1D9E75)",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: acting ? "default" : "pointer",
                  opacity: acting ? 0.7 : 1,
                }}>
                {acting ? "Closing…" : `✓ Close ${prevDateLabel}`}
              </button>

              <button
                onClick={handleSkipPrev}
                style={{
                  padding: "12px", borderRadius: 12,
                  border: "1.5px solid var(--rule,#e5e7eb)",
                  background: "transparent",
                  color: "var(--ink-dim,#555)", fontSize: 13,
                  fontWeight: 600, cursor: "pointer",
                }}>
                Skip — Open Today Anyway
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Step 2: open today ───────────────────────── */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>🏪</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink,#111)", marginBottom: 8 }}>
                Good morning! Open your store?
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-faint,#666)", lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: "var(--saffron,#e87722)" }}>
                  {fmtDate(today)}
                </span>
                {" "}— Opens a stock snapshot so you can track today's sales, profit, and low-stock items.
              </div>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 10,
                padding: "9px 13px", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleOpenDay}
                disabled={acting}
                style={{
                  padding: "15px", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg,var(--saffron,#e87722),#d45f00)",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: acting ? "default" : "pointer",
                  opacity: acting ? 0.7 : 1,
                }}>
                {acting ? "Opening…" : "🚀 Open Day Now"}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  onClick={handleSnooze}
                  style={{
                    padding: "11px", borderRadius: 12,
                    border: "1.5px solid var(--rule,#e5e7eb)",
                    background: "transparent",
                    color: "var(--ink-dim,#555)", fontSize: 12,
                    fontWeight: 600, cursor: "pointer",
                  }}>
                  ⏰ Remind in 1 hr
                </button>
                <button
                  onClick={handleDismiss}
                  style={{
                    padding: "11px", borderRadius: 12,
                    border: "1.5px solid var(--rule,#e5e7eb)",
                    background: "transparent",
                    color: "var(--ink-faint,#aaa)", fontSize: 12,
                    fontWeight: 600, cursor: "pointer",
                  }}>
                  Not today
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes dsGateSlideUp {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )

  return createPortal(modal, document.body)
}
