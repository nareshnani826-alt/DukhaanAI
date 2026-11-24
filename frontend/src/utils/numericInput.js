// Numbers-only boxes, app-wide: letters typed or pasted into a phone / PIN / OTP /
// numeric box are dropped as they arrive.
//  - phone (type="tel" or inputmode="tel"): digits, plus one leading "+", max 13 chars
//  - inputmode="numeric": digits only
//  - inputmode="decimal" on a text box: digits and one "."
//  - type="number": browsers already refuse letters but let "e" and "+" through; those are blocked
// Runs in the capture phase, before React's onChange, so React only ever sees the clean value.

const PHONE_MAX = 13
const NATIVE_VALUE_SET = typeof window !== "undefined"
  ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set
  : null

function kindOf(el) {
  if (!el || el.tagName !== "INPUT") return null
  const type = (el.getAttribute("type") || "text").toLowerCase()
  const mode = (el.getAttribute("inputmode") || "").toLowerCase()
  if (el.dataset.allowText !== undefined) return null           // escape hatch: data-allow-text
  if (type === "number") return "number"
  if (type === "tel" || mode === "tel") return "phone"
  if (type !== "text" && type !== "search" && type !== "password") return null
  if (mode === "numeric") return "digits"
  if (mode === "decimal") return "decimal"
  return null
}

function clean(kind, value) {
  if (kind === "phone") {
    const plus = value.trimStart().startsWith("+") ? "+" : ""
    return (plus + value.replace(/\D/g, "")).slice(0, PHONE_MAX)
  }
  if (kind === "digits") return value.replace(/\D/g, "")
  if (kind === "decimal") {
    const s = value.replace(/[^\d.]/g, "")
    const i = s.indexOf(".")
    return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "")
  }
  return value
}

function sanitize(el, kind) {
  const before = el.value
  const after = clean(kind, before)
  if (after === before) return false
  // Keep the cursor where the person was typing
  let caret = null
  try { caret = el.selectionStart } catch { /* some types have no selection */ }
  // Use the browser's own setter, not el.value = …: React watches el.value assignments, and
  // would then think nothing changed and skip onChange (a pasted "+91 98480 12345" was shown
  // cleaned in the box but never reached the form, so the phone saved as empty)
  NATIVE_VALUE_SET.call(el, after)
  if (caret !== null) {
    const kept = clean(kind, before.slice(0, caret)).length
    try { el.setSelectionRange(kept, kept) } catch { /* ignore */ }
  }
  return true
}

export function installNumericInputs() {
  if (typeof document === "undefined") return

  // Typing / pasting / autofill: clean before React reads the value
  document.addEventListener("input", e => {
    const kind = kindOf(e.target)
    if (!kind || kind === "number" || e.isComposing) return
    sanitize(e.target, kind)
  }, true)

  // Keyboards that compose words (Gboard on a text keyboard): clean when the word is done,
  // then tell React about the cleaned value
  document.addEventListener("compositionend", e => {
    const kind = kindOf(e.target)
    if (!kind || kind === "number") return
    if (sanitize(e.target, kind)) e.target.dispatchEvent(new Event("input", { bubbles: true }))
  }, true)

  // Number boxes: block the letters browsers allow ("e" for exponent, "+")
  document.addEventListener("keydown", e => {
    if (kindOf(e.target) !== "number" || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === "e" || e.key === "E" || e.key === "+") e.preventDefault()
  }, true)
  document.addEventListener("beforeinput", e => {
    if (kindOf(e.target) !== "number" || !e.data) return
    if (/[^\d.,-]/.test(e.data)) e.preventDefault()
  }, true)
}
