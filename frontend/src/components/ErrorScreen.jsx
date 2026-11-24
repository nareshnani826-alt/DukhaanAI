// If a screen crashes, show a short message with a Reload button instead of a blank page.
import { Component } from "react"

export default class ErrorScreen extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(err) { console.error("Screen crashed:", err) }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:14, padding:24, textAlign:"center", background:"var(--bg0)", color:"var(--ink)" }}>
        <div style={{ fontSize:44 }}>🔄</div>
        <div style={{ fontSize:20, fontWeight:800 }}>Something went wrong</div>
        <div style={{ fontSize:14, color:"var(--ink-dim)", maxWidth:320 }}>
          Your data is safe. Tap Reload to open the app again.
        </div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}
          style={{ minHeight:48, padding:"0 28px", borderRadius:12, fontWeight:800, fontSize:16 }}>
          Reload
        </button>
      </div>
    )
  }
}
