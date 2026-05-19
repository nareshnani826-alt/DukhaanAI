import { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Clear old dark theme cache — light is now default
    const saved = localStorage.getItem("dk_theme")
    if (!saved || saved === "dark") {
      localStorage.setItem("dk_theme", "light")
      return "light"
    }
    return saved
  })

  useEffect(() => {
    localStorage.setItem("dk_theme", theme)
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === "dark" ? "light" : "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
