import { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext()

function resolveTheme(setting) {
  if (setting === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return setting
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("dk_theme")
    return saved || "light"
  })

  useEffect(() => {
    localStorage.setItem("dk_theme", theme)
    const resolved = resolveTheme(theme)
    document.documentElement.setAttribute("data-theme", resolved)

    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = e => document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    }
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === "dark" ? "light" : "dark")
  }

  const resolved = resolveTheme(theme)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: resolved === "dark" }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
