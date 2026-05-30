// ── Thermal Printer — BLE + ESC/POS ──────────────────────────
// Supports 58mm (32 chars) and 80mm (48 chars) paper widths.
// Works with Rongta, Xprinter, iDPRT, HPRT and most generic
// Chinese BLE thermal printers sold in India.

// ── ESC/POS command bytes ─────────────────────────────────────
const ESC = 0x1B
const GS  = 0x1D
const LF  = 0x0A

export const CMD = {
  INIT:          [ESC, 0x40],
  ALIGN_LEFT:    [ESC, 0x61, 0x00],
  ALIGN_CENTER:  [ESC, 0x61, 0x01],
  ALIGN_RIGHT:   [ESC, 0x61, 0x02],
  BOLD_ON:       [ESC, 0x45, 0x01],
  BOLD_OFF:      [ESC, 0x45, 0x00],
  SIZE_NORMAL:   [GS,  0x21, 0x00],
  SIZE_WIDE:     [GS,  0x21, 0x10],   // double width
  SIZE_TALL:     [GS,  0x21, 0x01],   // double height
  SIZE_2X:       [GS,  0x21, 0x11],   // double width + height
  UNDERLINE_ON:  [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  FEED:          (n = 3) => [ESC, 0x64, n],
  CUT:           [GS,  0x56, 0x42, 0x00],
}

// ── BLE service/characteristic UUIDs (common thermal printers) ─
// Tried in order; first working combination is used.
const BLE_PROFILES = [
  { service: "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    char:    "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f" },  // Xprinter, iPosPrinter
  { service: "000018f0-0000-1000-8000-00805f9b34fb",
    char:    "000018f1-0000-1000-8000-00805f9b34fb" },  // Generic / Rongta
  { service: "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    char:    "49535343-8841-43f4-a8d4-ecbe34729bb3" },  // Microchip / HPRT
  { service: "0000ff00-0000-1000-8000-00805f9b34fb",
    char:    "0000ff02-0000-1000-8000-00805f9b34fb" },  // Some 80mm printers
]

const OPTIONAL_SERVICES = BLE_PROFILES.map(p => p.service)

// ── Text encoder helper ───────────────────────────────────────
const enc = new TextEncoder()
function bytes(...args) {
  const parts = []
  for (const a of args) {
    if (Array.isArray(a))        parts.push(...a)
    else if (typeof a === "string") parts.push(...enc.encode(a))
    else if (typeof a === "number") parts.push(a)
  }
  return new Uint8Array(parts)
}

// ── Layout helpers ────────────────────────────────────────────
function line(text = "", width = 32) {
  // Truncate or pad to exact width then add LF
  const s = (text + " ".repeat(width)).slice(0, width)
  return bytes(s, [LF])
}

function center(text, width = 32) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return line(" ".repeat(pad) + text, width)
}

function divider(char = "-", width = 32) {
  return bytes(char.repeat(width), [LF])
}

function cols(left, right, width = 32) {
  // Right-align `right` within `width`, left gets the rest
  const r   = String(right)
  const l   = String(left).slice(0, width - r.length - 1)
  const pad = width - l.length - r.length
  return line(l + " ".repeat(Math.max(1, pad)) + r, width)
}

function cols3(left, mid, right, width = 32) {
  const r   = String(right).padStart(8)
  const m   = String(mid).padStart(5)
  const l   = String(left).slice(0, width - r.length - m.length - 1)
  const pad = Math.max(1, width - l.length - m.length - r.length)
  return line(l + " ".repeat(pad) + m + r, width)
}

// ── Main receipt builder ──────────────────────────────────────
export function buildReceipt(invoice, storeName = "DukaanAI", opts = {}) {
  const W = opts.width || 32   // 32 for 58mm, 48 for 80mm
  const parts = []

  const add = (...chunks) => parts.push(...chunks)
  const str = (s) => bytes(String(s || ""), [LF])

  // ── Init ─────────────────────────────────────────────────
  add(bytes(CMD.INIT))
  add(bytes([LF]))

  // ── Store header ─────────────────────────────────────────
  add(bytes(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.SIZE_2X))
  add(center(storeName.toUpperCase().slice(0, W / 2), W))
  add(bytes(CMD.SIZE_NORMAL, CMD.BOLD_OFF))

  if (opts.address) {
    add(bytes(CMD.ALIGN_CENTER))
    add(center(opts.address, W))
  }
  if (opts.phone) add(center("Ph: " + opts.phone, W))
  if (opts.gstin) {
    add(bytes(CMD.BOLD_ON))
    add(center("GSTIN: " + opts.gstin, W))
    add(bytes(CMD.BOLD_OFF))
  }

  add(divider("=", W))

  // ── Invoice meta ─────────────────────────────────────────
  add(bytes(CMD.ALIGN_LEFT))
  const date = new Date(invoice.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  })
  const time = new Date(invoice.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
  add(cols("Invoice: " + (invoice.invoice_no || ""), date + " " + time, W))
  if (invoice.customer_name) {
    add(cols("Customer:", invoice.customer_name.slice(0, 14), W))
  }
  if (invoice.customer_phone) {
    add(cols("Phone:", invoice.customer_phone, W))
  }

  add(divider("-", W))

  // ── Items header ─────────────────────────────────────────
  add(bytes(CMD.BOLD_ON))
  if (W >= 48) {
    add(line("ITEM                   QTY   RATE   AMOUNT", W))
  } else {
    add(line("ITEM            QTY  AMOUNT", W))
  }
  add(bytes(CMD.BOLD_OFF))
  add(divider("-", W))

  // ── Line items ───────────────────────────────────────────
  const items = invoice.items || []
  for (const it of items) {
    const name   = (it.name || it.product_name || "Item").slice(0, W >= 48 ? 22 : 14)
    const qty    = String(it.qty ?? it.unit_qty ?? 1)
    const rate   = "₹" + Number(it.unit_price ?? it.mrp ?? 0).toFixed(0)
    const total  = "₹" + Number(it.total ?? it.amount ?? 0).toFixed(2)

    if (W >= 48) {
      add(cols3(name, qty + " x " + rate, total, W))
    } else {
      // 58mm: name on first line, qty+total on second
      add(line(name, W))
      add(cols("  " + qty + " x " + rate, total, W))
    }
  }

  add(divider("-", W))

  // ── Totals ───────────────────────────────────────────────
  const subtotal = Number(invoice.subtotal || 0)
  const cgst     = Number(invoice.cgst     || 0)
  const sgst     = Number(invoice.sgst     || 0)
  const gst      = cgst + sgst
  const total    = Number(invoice.total    || 0)

  add(cols("Subtotal", "₹" + subtotal.toFixed(2), W))
  if (gst > 0) {
    if (cgst && sgst) {
      add(cols("CGST", "₹" + cgst.toFixed(2), W))
      add(cols("SGST", "₹" + sgst.toFixed(2), W))
    } else {
      add(cols("GST", "₹" + gst.toFixed(2), W))
    }
  }

  add(divider("=", W))
  add(bytes(CMD.BOLD_ON, CMD.SIZE_WIDE))
  add(cols("TOTAL", "₹" + total.toFixed(2), W))
  add(bytes(CMD.SIZE_NORMAL, CMD.BOLD_OFF))
  add(divider("=", W))

  // ── Payment mode ─────────────────────────────────────────
  add(cols("Payment", invoice.payment_mode || "Cash", W))
  if (invoice.customer_gstin) add(cols("Buyer GSTIN", invoice.customer_gstin, W))

  add(divider("=", W))

  // ── Footer ───────────────────────────────────────────────
  add(bytes(CMD.ALIGN_CENTER))
  add(center("Thank you! Visit again!", W))
  add(center("Powered by DukaanAI", W))
  add(bytes([LF]))

  // ── Feed + cut ───────────────────────────────────────────
  add(bytes(CMD.FEED(4)))
  add(bytes(CMD.CUT))

  // Merge all Uint8Arrays into one
  const total_len = parts.reduce((s, p) => s + p.length, 0)
  const result = new Uint8Array(total_len)
  let offset = 0
  for (const p of parts) { result.set(p, offset); offset += p.length }
  return result
}

// ── BLE Printer class ─────────────────────────────────────────
export class ThermalPrinter {
  constructor() {
    this.device     = null
    this.server     = null
    this.char       = null
    this.connected  = false
    this.supported  = !!navigator.bluetooth
    this.onConnect    = null
    this.onDisconnect = null
    this.onError      = null
  }

  async connect() {
    if (!this.supported) throw new Error("Web Bluetooth not supported. Use Chrome on Android or Desktop.")

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: OPTIONAL_SERVICES,
    })

    device.addEventListener("gattserverdisconnected", () => {
      this.connected = false
      this.char      = null
      this.onDisconnect?.()
    })

    const server = await device.gatt.connect()
    const services = await server.getPrimaryServices()

    // Find the first writable characteristic
    let foundChar = null
    for (const profile of BLE_PROFILES) {
      try {
        const svc = await server.getPrimaryService(profile.service).catch(() => null)
        if (!svc) continue
        const ch = await svc.getCharacteristic(profile.char).catch(() => null)
        if (!ch) continue
        if (ch.properties.write || ch.properties.writeWithoutResponse) {
          foundChar = ch
          break
        }
      } catch {}
    }

    if (!foundChar) {
      // Last resort: scan all services for any writable characteristic
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics()
          for (const ch of chars) {
            if (ch.properties.write || ch.properties.writeWithoutResponse) {
              foundChar = ch; break
            }
          }
          if (foundChar) break
        } catch {}
      }
    }

    if (!foundChar) throw new Error("Printer found but no writable characteristic. Try a different printer.")

    this.device    = device
    this.server    = server
    this.char      = foundChar
    this.connected = true
    this.onConnect?.()
    return device.name || "Printer"
  }

  async print(data) {
    if (!this.char) throw new Error("Printer not connected")

    // BLE MTU is typically 20 bytes; some printers support up to 512 bytes
    // Safe chunk size: 128 bytes with a small delay between chunks
    const CHUNK = 128
    const useWrite = this.char.properties.write

    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK)
      if (useWrite) {
        await this.char.writeValue(chunk)
      } else {
        await this.char.writeValueWithoutResponse(chunk)
      }
      // Small delay to avoid buffer overflow on cheaper printers
      await new Promise(r => setTimeout(r, 20))
    }
  }

  async printInvoice(invoice, storeName, opts = {}) {
    const receipt = buildReceipt(invoice, storeName, opts)
    await this.print(receipt)
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.connected = false
    this.char      = null
  }
}

export const printer = new ThermalPrinter()
