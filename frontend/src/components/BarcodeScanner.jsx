import { useEffect, useRef, useState } from "react"

const ZXING_CDN = "https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js"

function loadZXing() {
  return new Promise((resolve, reject) => {
    if (window.ZXing) return resolve(window.ZXing)
    const s = document.createElement("script")
    s.src = ZXING_CDN
    s.onload = () => resolve(window.ZXing)
    s.onerror = () => reject(new Error("Failed to load ZXing"))
    document.head.appendChild(s)
  })
}

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef   = useRef(null)
  const readerRef  = useRef(null)
  const [status,   setStatus]  = useState("loading")  // loading | scanning | error
  const [error,    setError]   = useState("")
  const [cameras,  setCameras] = useState([])
  const [camIdx,   setCamIdx]  = useState(0)
  const [lastCode, setLastCode]= useState("")

  useEffect(() => {
    let mounted = true
    async function start() {
      try {
        setStatus("loading")
        const ZXing = await loadZXing()
        const hints = new Map()
        const formats = [
          ZXing.BarcodeFormat.EAN_13,
          ZXing.BarcodeFormat.EAN_8,
          ZXing.BarcodeFormat.CODE_128,
          ZXing.BarcodeFormat.CODE_39,
          ZXing.BarcodeFormat.QR_CODE,
          ZXing.BarcodeFormat.UPC_A,
          ZXing.BarcodeFormat.UPC_E,
        ]
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats)
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true)

        const reader = new ZXing.BrowserMultiFormatReader(hints)
        readerRef.current = reader

        const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices()
        if (!mounted) return
        if (!devices.length) throw new Error("No camera found on this device")

        setCameras(devices)
        setStatus("scanning")

        // Prefer back camera on mobile
        const backCam = devices.find(d =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        )
        const deviceId = backCam?.deviceId || devices[camIdx]?.deviceId

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (!mounted) return
          if (result) {
            const code = result.getText()
            if (code !== lastCode) {
              setLastCode(code)
              // Flash feedback
              if (videoRef.current) {
                videoRef.current.style.outline = "4px solid #1D9E75"
                setTimeout(() => {
                  if (videoRef.current) videoRef.current.style.outline = "none"
                }, 400)
              }
              onDetected(code)
            }
          }
        })
      } catch(e) {
        if (!mounted) return
        setStatus("error")
        setError(e.message || "Camera error")
      }
    }
    start()
    return () => {
      mounted = false
      readerRef.current?.reset()
    }
  }, [camIdx])

  async function switchCamera() {
    readerRef.current?.reset()
    setCamIdx(i => (i + 1) % cameras.length)
  }

  return (
    <div
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
        zIndex:200, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
      }}
    >
      {/* Header */}
      <div style={{
        position:"absolute", top:0, left:0, right:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 16px", background:"rgba(0,0,0,0.5)",
      }}>
        <span style={{ color:"#fff", fontSize:13, fontWeight:500 }}>
          Scan product barcode
        </span>
        <div style={{ display:"flex", gap:8 }}>
          {cameras.length > 1 && (
            <button onClick={switchCamera} style={{
              background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
              borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer",
            }}>
              Switch camera
            </button>
          )}
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
            borderRadius:8, padding:"6px 12px", fontSize:11, cursor:"pointer",
          }}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* Video */}
      <div style={{ position:"relative", width:"min(400px,90vw)" }}>
        <video
          ref={videoRef}
          style={{
            width:"100%", borderRadius:12, background:"#000",
            display: status === "error" ? "none" : "block",
            minHeight: 240,
          }}
          autoPlay playsInline muted
        />

        {/* Scanning overlay — crosshair */}
        {status === "scanning" && (
          <div style={{
            position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center", pointerEvents:"none",
          }}>
            <div style={{
              width:200, height:120, border:"2px solid #1D9E75",
              borderRadius:8, boxShadow:"0 0 0 2000px rgba(0,0,0,0.35)",
            }} />
          </div>
        )}

        {/* Loading overlay */}
        {status === "loading" && (
          <div style={{
            width:"100%", minHeight:240, borderRadius:12,
            background:"#111", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:10,
          }}>
            <div style={{
              width:32, height:32, border:"3px solid #333",
              borderTop:"3px solid #1D9E75", borderRadius:"50%",
              animation:"spin 0.8s linear infinite",
            }} />
            <span style={{ color:"#888", fontSize:12 }}>Starting camera...</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div style={{
            width:"100%", minHeight:240, borderRadius:12,
            background:"#1a0a0a", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:12, padding:20,
          }}>
            <div style={{ fontSize:32 }}>📷</div>
            <div style={{ color:"#f87171", fontSize:12, textAlign:"center" }}>{error}</div>
            {error.includes("permission") && (
              <div style={{ color:"#888", fontSize:11, textAlign:"center" }}>
                Allow camera access in browser settings, then refresh
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint */}
      <div style={{
        marginTop:16, color:"rgba(255,255,255,0.6)", fontSize:11, textAlign:"center",
      }}>
        {status === "scanning"
          ? "Point camera at barcode — it detects automatically"
          : status === "loading"
            ? "Requesting camera permission..."
            : "Check camera permissions"
        }
      </div>

      {/* Last scanned */}
      {lastCode && (
        <div style={{
          marginTop:12, background:"#1D9E75", color:"#fff",
          padding:"8px 20px", borderRadius:8, fontSize:12, fontFamily:"monospace",
        }}>
          Last scanned: {lastCode}
        </div>
      )}
    </div>
  )
}
