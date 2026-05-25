import { useEffect, useRef, useState } from "react"

// ZXing supports EAN-13, UPC-A, Code-128, Code-39, QR and 20+ formats
const ZXING_CDN = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"

function loadZXing() {
  return new Promise((resolve, reject) => {
    if (window.ZXing) return resolve(window.ZXing)
    const s = document.createElement("script")
    s.src = ZXING_CDN
    s.onload  = () => resolve(window.ZXing)
    s.onerror = () => reject(new Error("Failed to load barcode scanner"))
    document.head.appendChild(s)
  })
}

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const timerRef    = useRef(null)
  const readerRef   = useRef(null)
  const detectedRef = useRef(false)
  const [status,   setStatus]   = useState("loading")
  const [error,    setError]    = useState("")
  const [lastCode, setLastCode] = useState("")

  useEffect(() => {
    let mounted = true

    async function start() {
      try {
        const ZXing = await loadZXing()
        if (!mounted) return

        // Use getUserMedia directly — avoids ZXing's internal stream wrapper
        // which has known issues on iOS WebKit (Safari/Chrome)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()

        const reader = new ZXing.BrowserMultiFormatReader()
        readerRef.current = reader

        const canvas = canvasRef.current
        const ctx    = canvas.getContext("2d", { willReadFrequently: true })

        setStatus("scanning")

        // Poll at 10 fps — draw each frame to canvas, then decode
        timerRef.current = setInterval(() => {
          if (!mounted || detectedRef.current) return
          if (video.readyState < video.HAVE_ENOUGH_DATA) return

          canvas.width  = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)

          try {
            const result = reader.decodeFromCanvas(canvas)
            if (result) {
              const code = result.getText()
              detectedRef.current = true
              setLastCode(code)
              onDetected(code)
              setTimeout(() => { detectedRef.current = false }, 1500)
            }
          } catch (_) {
            // NotFoundException on every empty frame — ignore
          }
        }, 100)

      } catch (e) {
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

    start()

    return () => {
      mounted = false
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function handleClose() {
    clearInterval(timerRef.current)
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

      {/* Video + hidden canvas for frame decoding */}
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
        {/* Canvas is off-screen — used only for frame decoding */}
        <canvas ref={canvasRef} style={{ display:"none" }} />

        {/* Scanning overlay */}
        {status === "scanning" && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            pointerEvents:"none",
          }}>
            <div style={{
              width:"80%", height:80,
              border:"2.5px solid #1D9E75",
              borderRadius:8,
              boxShadow:"0 0 0 2000px rgba(0,0,0,0.45)",
            }} />
          </div>
        )}
      </div>

      <div style={{
        marginTop:16, color:"rgba(255,255,255,0.6)",
        fontSize:12, textAlign:"center", padding:"0 20px",
      }}>
        {status === "scanning"
          ? "Hold barcode steady inside the green box"
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
