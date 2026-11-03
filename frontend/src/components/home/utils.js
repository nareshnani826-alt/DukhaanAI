// Non-component helpers shared by the homepage sections.

export const APK_URL = "https://github.com/nareshnani826-alt/DukhaanAI/releases/latest/download/dukaanai.apk"

// LoginHome makes #root the scroll container, so scroll-linked effects measure it
export const rootScroller = { current: typeof document !== "undefined" ? document.getElementById("root") : null }

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}
