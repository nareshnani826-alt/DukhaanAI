import { useEffect, useRef, useState } from "react"

// Use jsQR — works on iOS Safari, Android Chrome, Desktop
const JSQR_CDN = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"

function loadJsQR() {
  return new Promise((resolve, reject) => {
    if (window.jsQR) return resolve(window.jsQR)
    const s = document.createElement("script")
    s.src = JSQR_CDN
    s.onload  = () => resolve(window.jsQR)
    s.onerror = () => reject(new Error("Failed to load scanner"))
    document.head.appendChild(s)
  })
}

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const rafRef     = useRef(null)
  const [status,   setStatus]  = useState("loading")
  const [error,    setError]   = useState("")
  const [lastCode, setLastCode]= useState("")
  const lastCodeRef = useRef("")

  useEffect(() => {
    let mounted = true

    async function start() {
      try {
        await loadJsQR()
        if (!mounted) return

        // Request camera — prefer back camera
        const constraints = {
          video: {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        setStatus("scanning")
        scanFrame(mounted)
      } catch(e) {
        if (!mounted) return
        setStatus("error")
        if (e.name === "NotAllowedError")
          setError("Camera permission denied. Tap the camera icon in your browser address bar and allow access.")
        else if (e.name === "NotFoundError")
          setError("No camera found on this device.")
        else
          setError(e.message || "Camera error")
      }
    }

    function scanFrame(mounted) {
      if (!mounted || !videoRef.current || !canvasRef.current) return

      const video  = videoRef.current
      const canvas = canvasRef.current
      const ctx    = canvas.getContext("2d")

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        })

        if (code && code.data && code.data !== lastCodeRef.current) {
          lastCodeRef.current = code.data
          setLastCode(code.data)
          onDetected(code.data)
          return // stop scanning after detection
        }
      }

      rafRef.current = requestAnimationFrame(() => scanFrame(mounted))
    }

    start()

    return () => {
      mounted = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function handleClose() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    onClose()
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
      zIndex:200, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display:"none" }} />

      {/* Top bar */}
      <div style={{
        position:"absolute", top:0, left:0, right:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 16px", background:"rgba(0,0,0,0.5)",
      }}>
        <span style={{ color:"#fff", fontSize:14, fontWeight:500 }}>
          Scan barcode
        </span>
        <button onClick={handleClose} style={{
          background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
          borderRadius:8, padding:"7px 14px", fontSize:12, cursor:"pointer",
        }}>✕ Close</button>
      </div>

      {/* Video */}
      <div style={{ position:"relative", width:"min(400px,95vw)" }}>
        {status === "loading" && (
          <div style={{
            width:"100%", height:280, borderRadius:12, background:"#111",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:12,
          }}>
            <div style={{
              width:36, height:36, border:"3px solid #333",
              borderTop:"3px solid #1D9E75", borderRadius:"50%",
              animation:"spin 0.8s linear infinite",
            }} />
            <span style={{ color:"#888", fontSize:12 }}>Starting camera...</span>
          </div>
        )}

        {status === "error" && (
          <div style={{
            width:"100%", borderRadius:12, background:"#1a0808",
            padding:24, display:"flex", flexDirection:"column",
            alignItems:"center", gap:12, textAlign:"center",
          }}>
            <div style={{ fontSize:40 }}>📷</div>
            <div style={{ color:"#f87171", fontSize:12, lineHeight:1.6 }}>{error}</div>
            <button onClick={handleClose} style={{
              background:"#1D9E75", color:"#fff", border:"none",
              borderRadius:8, padding:"8px 20px", fontSize:12, cursor:"pointer",
            }}>Close</button>
          </div>
        )}

        <video ref={videoRef} autoPlay playsInline muted
          style={{
            width:"100%", borderRadius:12, background:"#000",
            display: status === "scanning" ? "block" : "none",
            maxHeight:"60vh",
          }}
        />

        {/* Scanning overlay */}
        {status === "scanning" && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            pointerEvents:"none",
          }}>
            <div style={{
              width:220, height:100,
              border:"2.5px solid #1D9E75",
              borderRadius:8,
              boxShadow:"0 0 0 2000px rgba(0,0,0,0.45)",
            }} />
          </div>
        )}
      </div>

      <div style={{
        marginTop:16, color:"rgba(255,255,255,0.6)",
        fontSize:12, textAlign:"center",
      }}>
        {status === "scanning"
          ? "Point barcode inside the green box"
          : status === "loading" ? "Requesting camera..." : ""}
      </div>

      {lastCode && (
        <div style={{
          marginTop:12, background:"#1D9E75", color:"#fff",
          padding:"8px 20px", borderRadius:20,
          fontSize:12, fontFamily:"monospace",
        }}>
          ✓ {lastCode}
        </div>
      )}
    </div>
  )
}
