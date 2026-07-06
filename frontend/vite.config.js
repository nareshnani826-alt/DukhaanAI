import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Routes that exist both as React pages AND as backend API paths.
// A browser back/forward navigation sends a real HTTP request with
// Accept: text/html — we must serve index.html in that case, not
// proxy to the backend (which returns {"detail":"Not authenticated"}).
const SPA_ROUTES = new Set([
  "/customers", "/udhar", "/admin", "/sales", "/insights",
  "/products", "/invoices",
])

function apiProxy(target = "http://localhost:8000") {
  return {
    target,
    changeOrigin: true,
    bypass(req) {
      // Browser page navigation sends "text/html" in Accept.
      // Fetch/XHR API calls send "application/json" or no html accept.
      const accept = req.headers["accept"] || ""
      if (accept.includes("text/html") && SPA_ROUTES.has(req.url?.split("?")[0])) {
        return "/index.html"   // let React Router handle it
      }
      return null              // proxy to backend as normal
    },
  }
}

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Capacitor plugins use native bridges — exclude from Vite's pre-bundler
    // so the web build doesn't choke on them. Dynamic imports load them only
    // at runtime inside isNativePlatform() branches.
    exclude: ['@capacitor-community/speech-recognition'],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/auth":              apiProxy(),
      "/products":          apiProxy(),
      "/sales":             apiProxy(),
      "/invoices":          apiProxy(),
      "/customers":         apiProxy(),
      "/chat":              apiProxy(),
      "/insights":          apiProxy(),
      "/api":               apiProxy(),
      "/admin":             apiProxy(),
      "/aai":               apiProxy(),
      "/community-catalog": apiProxy(),
      "/day-sessions":      apiProxy(),
      "/expiry":            apiProxy(),
      "/invoice-scan":      apiProxy(),
      "/learning":          apiProxy(),
      "/subscriptions":     apiProxy(),
      "/udhar":             apiProxy(),
      "/wastage":           apiProxy(),
      "/bangle/":           apiProxy(),
    },
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: 'all'
  }
})
