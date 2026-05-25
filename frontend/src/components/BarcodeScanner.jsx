import { useEffect, useRef, useState } from "react"
import { BarcodeScanner as MLKitBarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { Capacitor } from '@capacitor/core'

// ZXing supports EAN-13, UPC-A, Code-128, Code-39, QR and 20+ formats (browser fallback)
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

const isNative = () =>
  (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
  (Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform())

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef    = useRef(null)
  const readerRef   = useRef(null)
  const detectedRef = useRef(false)
  const nativeTriedRef = useRef(false)
  const [status,   setStatus]   = useState("loading")
  const [error,    setError]    = useState("")
  const [lastCode, setLastCode] = useState("")

  // ── Native (Google MLKit / Lens) ─────────────────────────────
  useEffect(() => {
    if (!isNative()) return
    if (nativeTriedRef.current) return
    nativeTriedRef.current = true

    let cancelled = false
    ;(async () => {
      try {
        if (typeof MLKitBarcodeScanner.isGoogleBarcodeScannerModuleAvailable === 'function') {
          try {
            const { available } = await MLKitBarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
            if (!available && typeof MLKitBarcodeScanner.installGoogleBarcodeScannerModule === 'function') {
              alert('Google Barcode Scanner module not found. Installing now...')
              await MLKitBarcodeScanner.installGoogleBarcodeScannerModule()
              alert('Google Barcode Scanner module installed.')
            }
          } catch (modErr) {
            console.warn('module check skipped:', modErr)
          }
        }
        try {
          const perm = await MLKitBarcodeScanner.requestPermissions()
          if (!perm.camera) {
            alert('Camera permission is required for barcode scanning.')
            if (!cancelled) onClose && onClose()
            return
          }
        } catch (permErr) {
          console.warn('perm check skipped:', permErr)
        }
        const scanRes = await MLKitBarcodeScanner.scan()
        if (cancelled) return
        if (scanRes?.barcodes?.length) {
          const code = scanRes.barcodes[0].rawValue
          setLastCode(code)
          onDetected && onDetected(code)
        }
        // Close the overlay after scan returns (whether or not a code was read)
        onClose && onClose()
      } catch (e) {
        console.error('MLKit scan error:', e)
        if (!cancelled) {
          alert('Barcode scan failed: ' + (e?.message || e))
          onClose && onClose()
        }
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Browser (ZXing) ──────────────────────────────────────────
  useEffect(() => {
    if (isNative()) return
    let mounted = true

    async function start() {
      try {
        const ZXing = await loadZXing()
        if (!mounted) return

        const hints = new Map([
          [ZXing.DecodeHintType.TRY_HARDER, true],
          [ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.QR_CODE,
          ]],
        ])
        const reader = new ZXing.BrowserMultiFormatReader(hints)
        readerRef.current = reader

        setStatus("scanning")

        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (!mounted || detectedRef.current) return
            if (result) {
              const code = result.getText()
              detectedRef.current = true
              setLastCode(code)
              onDetected(code)
              setTimeout(() => { detectedRef.current = false }, 1500)
            }
          }
        )
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
      try { readerRef.current?.reset() } catch (_) {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    try { readerRef.current?.reset() } catch (_) {}
    onClose()
  }

  // On native, MLKit shows its own full-screen scanner; we don't render any UI
  if (isNative()) return null

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
      zIndex:200, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{
        position:"absolute", top:0, left:0, right:0,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"12px 16px", background:"rgba(0,0,0,0.5)",
      }}>
        <span style={{ color:"#fff", fontSize:14, fontWeight:500 }}>Scan barcode</span>
        <button onClick={handleClose} style={{
          background:"rgba(255,255,255,0.15)", border:"none", color:"#fff",
          borderRadius:8, padding:"7px 14px", fontSize:12, cursor:"pointer",
        }}>✕ Close</button>
      </div>

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

        {status === "scanning" && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            pointerEvents:"none",
          }}>
            <div style={{
              width:"80%", height:80,
              border:"2.5px solid #1D9E75", borderRadius:8,
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
