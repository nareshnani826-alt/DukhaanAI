/**
 * DukaanAI Logo — pure SVG, no external dependencies.
 *
 * Usage:
 *   <Logo />              icon + wordmark (sidebar)
 *   <Logo iconOnly />     48×48 square icon (AuthModal, favicon fallback)
 *   <Logo size={32} />    custom icon size
 */
export default function Logo({ iconOnly = false, size = 40, storeLabel = "" }) {
  const id = "dk_logo_grad_" + size   // unique gradient ID per size instance

  const Icon = (
    <svg
      width={size} height={size}
      viewBox="0 0 48 48" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, borderRadius: size * 0.23 }}
      aria-label="DukaanAI"
    >
      <defs>
        {/* Main background gradient: saffron → deep amber */}
        <linearGradient id={id + "_bg"} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F7973A"/>
          <stop offset="100%" stopColor="#C25500"/>
        </linearGradient>
        {/* Top-edge shine */}
        <linearGradient id={id + "_shine"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* ── Background ── */}
      <rect width="48" height="48" rx="11" fill={`url(#${id}_bg)`}/>
      {/* Subtle top shine */}
      <rect width="48" height="24" rx="11" fill={`url(#${id}_shine)`}/>

      {/* ── Shop silhouette (white) ── */}

      {/* Roof / pediment triangle */}
      <path d="M8 23 L24 11 L40 23 Z" fill="white"/>

      {/* Building body */}
      <rect x="9" y="23" width="30" height="17" rx="1" fill="white"/>

      {/* Arched door */}
      <path d="M18.5 40 L18.5 33 C18.5 29.96 21.0 28 24 28 C27.0 28 29.5 29.96 29.5 33 L29.5 40 Z"
        fill="#E87722"/>

      {/* Left window */}
      <rect x="11"  y="25.5" width="6" height="5" rx="1.2" fill="#F0852A" opacity="0.45"/>
      {/* Right window */}
      <rect x="31"  y="25.5" width="6" height="5" rx="1.2" fill="#F0852A" opacity="0.45"/>

      {/* Door knob */}
      <circle cx="27.5" cy="34.5" r="0.9" fill="white" opacity="0.75"/>

      {/* ── AI Sparkle badge (jade green) ── */}
      <circle cx="38.5" cy="9.5" r="6" fill="#1A9268"/>
      <circle cx="38.5" cy="9.5" r="4.5" fill="#1D9E75"/>

      {/* Sparkle cross */}
      <line x1="38.5" y1="6.5" x2="38.5" y2="12.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="35.5" y1="9.5" x2="41.5" y2="9.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>

      {/* Sparkle diagonals (smaller) */}
      <line x1="36.4" y1="7.4" x2="40.6" y2="11.6" stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.6"/>
      <line x1="40.6" y1="7.4" x2="36.4" y2="11.6" stroke="white" strokeWidth="0.7" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )

  if (iconOnly) return Icon

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {Icon}
      <div>
        <div style={{
          fontFamily: "'Tiro Devanagari Hindi', serif",
          fontSize: Math.round(size * 0.43),
          fontWeight: 700,
          color: "var(--ink)",
          lineHeight: 1,
          letterSpacing: "-0.2px",
        }}>
          दुकान<span style={{ color: "var(--saffron, #e87722)" }}>•</span>
          <span style={{
            fontFamily: "system-ui, sans-serif",
            color: "#1D9E75",
            fontWeight: 800,
            letterSpacing: "-0.5px",
          }}>AI</span>
        </div>
        {storeLabel && (
          <div style={{
            fontSize: Math.round(size * 0.22),
            color: "var(--ink-faint)",
            marginTop: 2,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
          }}>
            {storeLabel}
          </div>
        )}
      </div>
    </div>
  )
}
