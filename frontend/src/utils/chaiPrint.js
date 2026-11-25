import { printReceiptLines } from "./print.js"
// Print a chai bill on a 58 mm thermal printer.
// Android app: Android's print screen (Bluetooth receipt-printer apps such as RawBT show up there).
// Website: the browser's print dialog. See utils/print.js.

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

export const padLine = pad
export const centerLine = center
export const LINE_WIDTH = W

// Printed through Android's print screen (Bluetooth receipt-printer apps such as RawBT appear there)
// or the browser's — never a new window or an app link, which could leave the app.
export function printChaiBill(order, storeName) {
  const lines = receiptLines(order, storeName)
  return printReceiptLines(`Bill ${order.order_no}`, lines)
}
