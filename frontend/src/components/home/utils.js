// Non-component helpers shared by the homepage sections.

// The app on Google Play (com.dukaanai.app). While the app is in closed testing only testers can
// open it; everyone else sees "Item not found" until the production release (user chose this, 2026-11-28).
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.dukaanai.app"

// LoginHome makes #root the scroll container, so scroll-linked effects measure it
export const rootScroller = { current: typeof document !== "undefined" ? document.getElementById("root") : null }

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}
