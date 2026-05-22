import { createContext, useContext, useState } from "react"

export const APP_MODES = {
  lite: {
    label: "Lite", hindi: "सरल", emoji: "🌱",
    desc: "5 screens · perfect for beginners",
    color: "var(--jade)",
    screens: ["/dashboard", "/billing", "/voice", "/udhar", "/inventory"],
  },
  standard: {
    label: "Standard", hindi: "साधारण", emoji: "⚡",
    desc: "11 screens · daily kirana use",
    color: "var(--brass)",
    screens: [
      "/dashboard", "/billing", "/voice", "/udhar", "/inventory",
      "/demand", "/customers", "/day", "/wastage", "/history", "/bulk-import",
    ],
  },
  pro: {
    label: "Pro", hindi: "पूर्ण", emoji: "🚀",
    desc: "All screens · busy shops",
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
