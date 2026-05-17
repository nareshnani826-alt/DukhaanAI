import { useEffect, useState } from "react"

export default function InstallPrompt() {
  const [prompt,    setPrompt]    = useState(null)
  const [installed, setInstalled] = useState(false)
  const [show,      setShow]      = useState(false)

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true); return
    }
    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault(); setPrompt(e)
      setTimeout(() => setShow(true), 10000)
    })
    window.addEventListener("appinstalled", () => {
      setInstalled(true); setShow(false)
    })
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const result = await prompt.userChoice
    if (result.outcome === "accepted") { setInstalled(true); setShow(false) }
  }

  if (installed || !show) return null

  return (
    <div style={{
      position:"fixed", bottom:20, left:12, right:12, zIndex:500,
      background:"#1D9E75", color:"#fff", borderRadius:14,
      padding:"14px 16px", boxShadow:"0 4px 24px rgba(0,0,0,0.2)",
      display:"flex", alignItems:"center", gap:12,
    }}>
      <span style={{ fontSize:24 }}>🏪</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>Install DukaanAI App</div>
        <div style={{ fontSize:11, opacity:0.85 }}>Works offline · Home screen icon</div>
      </div>
      <button onClick={install} style={{
        background:"#fff", color:"#1D9E75", border:"none",
        borderRadius:8, padding:"7px 16px", fontSize:12,
        fontWeight:600, cursor:"pointer",
      }}>Install</button>
      <button onClick={() => setShow(false)} style={{
        background:"rgba(255,255,255,0.2)", border:"none", color:"#fff",
        borderRadius:8, padding:"7px 10px", fontSize:12, cursor:"pointer",
      }}>Later</button>
    </div>
  )
}