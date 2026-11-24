import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.jsx'
import { installAutoCapitalize } from './utils/autoCapitalize.js'
import { installNumericInputs } from './utils/numericInput.js'

installAutoCapitalize()
installNumericInputs()

// A website update renames the screen files. A tab opened before the update then asks
// for a file that no longer exists and the screen came up blank. Reload once to get the
// new version (at most once a minute, so a real outage can never cause a reload loop).
window.addEventListener('vite:preloadError', e => {
  try {
    const last = +sessionStorage.getItem('dk_chunk_reload') || 0
    if (Date.now() - last < 60000) return
    sessionStorage.setItem('dk_chunk_reload', String(Date.now()))
  } catch { /* private mode: still reload once */ }
  e.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Respect the phone's "reduce motion" setting for every animation in the app */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
