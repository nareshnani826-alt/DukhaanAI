import { createContext, useContext, useState } from "react"

export const APP_MODES = {
  lite: {
    label: "Simple", hindi: "सरल", emoji: "🌱",
    desc: "Only billing, stock, khata and past bills",
    color: "var(--jade)",
    screens: ["/dashboard", "/billing", "/voice", "/udhar", "/inventory", "/history"],
  },
  standard: {
    label: "Standard", hindi: "साधारण", emoji: "⚡",
    desc: "Adds customers, day close, damaged goods and more",
    color: "var(--brass)",
    screens: [
      "/dashboard", "/billing", "/voice", "/udhar", "/inventory",
      "/demand", "/customers", "/day", "/wastage", "/history", "/bulk-import",
    ],
  },
  pro: {
    label: "All", hindi: "पूर्ण", emoji: "🚀",
    desc: "Every feature, including reports and AI insights",
    color: "var(--saffron)",
    screens: "all",
  },
}

const AppModeCtx = createContext(null)

export function AppModeProvider({ children }) {
  const [appMode, setAppModeState] = useState(
    () => localStorage.getItem("dk_app_mode") || "pro"
  )

  function setAppMode(mode) {
    setAppModeState(mode)
    localStorage.setItem("dk_app_mode", mode)
  }

  function isScreenVisible(path) {
    // Settings and Help are always reachable, whatever the mode
    if (path === "/settings" || path === "/help") return true
    const mode = APP_MODES[appMode]
    if (!mode || mode.screens === "all") return true
    return mode.screens.includes(path)
  }

  return (
    <AppModeCtx.Provider value={{ appMode, setAppMode, isScreenVisible, APP_MODES }}>
      {children}
    </AppModeCtx.Provider>
  )
}

export const useAppMode = () => useContext(AppModeCtx)
