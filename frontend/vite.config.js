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
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 4173,
    allowedHosts: 'all'
  }
})