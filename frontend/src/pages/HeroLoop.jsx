export default function HeroLoop() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0a0a",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", background: "rgba(20,11,6,0.95)",
        borderBottom: "1px solid rgba(244,228,193,0.10)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg,#f6c768,#c08a3a,#5a3e18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Tiro Devanagari Hindi',serif",
            fontWeight: 700, fontSize: 17, color: "#1a0c04",
          }}>द</div>
          <div>
            <div style={{ fontFamily: "'Tiro Devanagari Hindi',serif", fontSize: 16, color: "#f4e4c1" }}>
              दुकान<span style={{ color: "#e87722" }}>•</span>AI
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#7a6a51", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Hero Loop · 34s
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
            color: "#7a6a51", letterSpacing: "1.2px",
          }}>
            SPACE = play/pause · ← → = seek
          </div>
          <a href="/dashboard" style={{
            background: "rgba(244,228,193,0.08)",
            border: "1px solid rgba(244,228,193,0.12)",
            color: "#b9a382", borderRadius: 8,
            padding: "5px 14px", fontSize: 11, fontWeight: 600,
            textDecoration: "none", fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}>← Back to app</a>
        </div>
      </div>

      {/* Full iframe */}
      <iframe
        src="/hero-loop.html"
        style={{ flex: 1, border: "none", width: "100%", display: "block" }}
        title="DukaanAI Hero Loop"
      />
    </div>
  )
}
