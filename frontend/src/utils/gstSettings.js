// Vendor-wide default for whether a new bill starts with GST applied.
// Off by default — most local vendors don't issue GST invoices. Set once
// in Settings; each bill (Kirana or Bangle) can still override it per-bill.
const KEY = "dk_default_apply_gst"

export function getDefaultApplyGst() {
  try { return localStorage.getItem(KEY) === "1" } catch { return false }
}

export function setDefaultApplyGst(value) {
  try { localStorage.setItem(KEY, value ? "1" : "0") } catch {}
}
