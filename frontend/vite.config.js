import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
      "/auth":              { target: "http://localhost:8000", changeOrigin: true },
      "/products":          { target: "http://localhost:8000", changeOrigin: true },
      "/sales":             { target: "http://localhost:8000", changeOrigin: true },
      "/invoices":          { target: "http://localhost:8000", changeOrigin: true },
      "/customers":         { target: "http://localhost:8000", changeOrigin: true },
      "/chat":              { target: "http://localhost:8000", changeOrigin: true },
      "/insights":          { target: "http://localhost:8000", changeOrigin: true },
      "/voice":             { target: "http://localhost:8000", changeOrigin: true },
      "/api":               { target: "http://localhost:8000", changeOrigin: true },
      "/admin":             { target: "http://localhost:8000", changeOrigin: true },
      "/aai":               { target: "http://localhost:8000", changeOrigin: true },
      "/community-catalog": { target: "http://localhost:8000", changeOrigin: true },
      "/day-sessions":      { target: "http://localhost:8000", changeOrigin: true },
      "/expiry":            { target: "http://localhost:8000", changeOrigin: true },
      "/invoice-scan":      { target: "http://localhost:8000", changeOrigin: true },
      "/learning":          { target: "http://localhost:8000", changeOrigin: true },
      "/subscriptions":     { target: "http://localhost:8000", changeOrigin: true },
      "/udhar":             { target: "http://localhost:8000", changeOrigin: true },
      "/wastage":           { target: "http://localhost:8000", changeOrigin: true },
      "/bangle/":           { target: "http://localhost:8000", changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: 'all'
  }
})