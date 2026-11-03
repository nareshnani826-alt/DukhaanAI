// Print a chai bill on a 58 mm thermal printer.
// Android app: hands ESC/POS bytes to the free RawBT app, which prints to any Bluetooth/USB
// printer it is paired with. Browser: opens a 58 mm receipt and the system print dialog.

const W = 32  // characters per line on 58 mm paper

const pad = (l, r) => {
  l = String(l); r = String(r)
  const room = W - r.length - 1
  return (l.length > room ? l.slice(0, room) : l).padEnd(room) + " " + r
}
const center = s => { s = String(s).slice(0, W); return " ".repeat(Math.floor((W - s.length) / 2)) + s }

export function receiptLines(order, storeName) {
  const when = new Date(order.paid_at || order.created_at)
  const paid = order.payment_mode === "credit" ? `Khata: ${order.customer_name || ""}` : order.payment_mode === "upi" ? "Paid: UPI" : "Paid: Cash"
  return [
    center(storeName || "Chai Shop"),
    center(`Bill #${order.order_no}${order.label ? " " + order.label : ""}`),
    center(`${when.toLocaleDateString("en-IN")} ${when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`),
    "-".repeat(W),
    ...(order.items || []).map(it => pad(`${it.name} x${it.qty}`, `Rs ${Math.round(it.price * it.qty * 100) / 100}`)),
    "-".repeat(W),
    pad("TOTAL", `Rs ${order.total}`),
    paid,
    "",
    center("Thank you! Visit again"),
  ]
}

function escpos(lines) {
  const text = lines.join("\n") + "\n\n\n"
  const bytes = [0x1b, 0x40, ...new TextEncoder().encode(text), 0x1d, 0x56, 0x42, 0x00]  // init … partial cut
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

export function printChaiBill(order, storeName) {
  const lines = receiptLines(order, storeName)
  if (window.Capacitor?.isNativePlatform?.()) {
    window.location.href = `intent:base64,${escpos(lines)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`
    return
  }
  const w = window.open("", "_blank", "width=320,height=600")
  if (!w) return
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bill ${order.order_no}</title>
<style>@page{size:58mm auto;margin:2mm}body{margin:0;font:12px/1.35 monospace;white-space:pre}</style></head>
<body>${esc(lines.join("\n"))}<script>onload=()=>{print();setTimeout(()=>close(),300)}</scr` + `ipt></body></html>`)
  w.document.close()
}
