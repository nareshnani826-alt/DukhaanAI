import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.jsx'
import { installAutoCapitalize } from './utils/autoCapitalize.js'

installAutoCapitalize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Respect the phone's "reduce motion" setting for every animation in the app */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
