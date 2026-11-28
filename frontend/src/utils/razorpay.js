// Website payment for Pro with Razorpay Standard Checkout.
// The server makes the order (it decides the price) and checks the payment afterwards; the key
// secret never comes here. Not used in the Android app — Google Play requires Play Billing there.
import { api } from "../sync/db"

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js"
let loading = null

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script")
      s.src = SCRIPT
      s.onload = () => resolve()
      s.onerror = () => { loading = null; reject(new Error("Could not open the payment page. Check your internet and try again.")) }
      document.body.appendChild(s)
    })
  }
  return loading
}

// Opens the Razorpay payment window for 30 days of Pro.
// Resolves { plan_expires_at, days } once the server has confirmed the payment;
// rejects with { cancelled: true } if the window was closed, or an Error with a message to show.
export async function payForPro() {
  await loadCheckout()
  const order = await api.post("/subscriptions/checkout/order", {})
  return new Promise((resolve, reject) => {
    let settled = false
    let failure = ""   // last failed attempt's reason, shown if they then close the window
    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "DukhaanAI",
      description: `Pro plan · ${order.days} days`,
      prefill: { name: order.store_name, email: order.email, contact: order.phone },
      notes: { store: order.store_name },
      theme: { color: "#d4621f" },
      handler: async (res) => {
        settled = true
        try {
          resolve(await api.post("/subscriptions/checkout/verify", {
            razorpay_order_id: res.razorpay_order_id,
            razorpay_payment_id: res.razorpay_payment_id,
            razorpay_signature: res.razorpay_signature,
          }))
        } catch (e) { reject(e) }
      },
      modal: { ondismiss: () => {
        if (settled) return
        reject(failure ? new Error(`Payment failed: ${failure}. No money was taken — please try again.`) : { cancelled: true })
      } },
    })
    // A failed attempt keeps the window open so the customer can try another way to pay;
    // only remember the reason in case they then close it.
    rzp.on("payment.failed", (r) => { failure = r?.error?.description || "the bank declined it" })
    rzp.open()
  })
}
