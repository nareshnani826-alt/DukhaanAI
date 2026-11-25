// One way to print anything, that never leaves the app.
//   Android app: Android's own print screen (pick a printer, a Bluetooth receipt-printer app such as
//                RawBT, or "Save as PDF"); Back returns straight to the app.
//   Website:     a hidden frame inside this page prints just the given content — no new tab.
// Never use window.open() / location.href to print: in the Android app a new window covers the
// app with no way back.
import { isNativeApp } from "./features"

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

function htmlDoc(title, bodyHtml, css = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>body{margin:0;padding:8px;font-family:Arial,sans-serif;color:#111;background:#fff}
@media print{@page{margin:6mm}}${css}</style></head><body>${bodyHtml}</body></html>`
}

export async function printHtml(title, bodyHtml, css = "") {
  const doc = htmlDoc(title, bodyHtml, css)
  if (isNativeApp()) {
    try {
      const { Printer } = await import("@capgo/capacitor-printer")
      await Printer.printHtml({ name: title || "DukhaanAI", html: doc })
    } catch (e) {
      // Cancelled by the user is fine; anything else gets a plain message instead of a silent failure
      if (!/cancel/i.test(String(e?.message || e))) alert("Could not open printing on this phone. " + (e?.message || ""))
    }
    return
  }
  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  document.body.appendChild(frame)
  const d = frame.contentDocument
  d.open(); d.write(doc); d.close()
  await new Promise(r => setTimeout(r, 350))   // let images / SVG lay out
  try { frame.contentWindow.focus(); frame.contentWindow.print() }
  finally { setTimeout(() => frame.remove(), 1500) }
}

// The CSS rules this page uses, so a printed piece of the screen looks the same on paper
function pageCss() {
  let out = ""
  for (const sheet of Array.from(document.styleSheets)) {
    try { for (const rule of Array.from(sheet.cssRules)) out += rule.cssText + "\n" } catch { /* other-origin sheet */ }
  }
  return out
}

// Print one element exactly as it looks on screen (e.g. the bill)
export function printElement(el, title) {
  if (!el) return Promise.resolve()
  return printHtml(title, el.outerHTML, pageCss() + "\n*{-webkit-print-color-adjust:exact;print-color-adjust:exact}")
}

// Print the bill that is open on screen (InvoiceView marks its paper part with data-print-root)
export function printOpenInvoice(title = "Bill") {
  const all = document.querySelectorAll("[data-print-root]")
  return printElement(all[all.length - 1], title)
}

// Plain monospace receipt (58 mm thermal style)
export function printReceiptLines(title, lines) {
  return printHtml(title, `<pre>${esc(lines.join("\n"))}</pre>`,
    "@page{size:58mm auto;margin:2mm} pre{margin:0;font:12px/1.35 ui-monospace,Consolas,monospace;white-space:pre}")
}
