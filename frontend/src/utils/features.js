// Shop types that are switched on. The bangle store is not tested yet, so it is hidden
// everywhere (sign-up, pickers, switchers, its pages). Set BANGLE_ENABLED = true to bring it back.
export const BANGLE_ENABLED = false

const OFF = BANGLE_ENABLED ? [] : ["bangle_fancy", "bangle"]

export const shopEnabled = id => !OFF.includes(id)

// A restaurant runs on the chai shop screens (/chai-*) and the /chai API, with its own
// name and starter menu. Use these instead of comparing with "chai" directly.
export const isFoodShop = id => id === "chai" || id === "restaurant"
export const isRestaurant = () => { try { return localStorage.getItem("storeMode") === "restaurant" } catch { return false } }

// A vendor's modules without the switched-off shop types (never empty: falls back to kirana)
export function liveModules(mods) {
  const list = (mods || ["kirana"]).filter(shopEnabled)
  return list.length ? list : ["kirana"]
}

// This phone was last on the bangle store: open kirana instead
try {
  if (!shopEnabled(localStorage.getItem("storeMode") || "kirana")) localStorage.setItem("storeMode", "kirana")
  if (!shopEnabled(localStorage.getItem("dk_home_shop") || "general")) localStorage.removeItem("dk_home_shop")
} catch {}

// Inside the Android app (Play Store build). Google Play requires in-app sales of Pro to use
// Play Billing, so the app shows no prices or upgrade buttons; plans bought on the website still work.
export const isNativeApp = () => { try { return !!window.Capacitor?.isNativePlatform?.() } catch { return false } }
