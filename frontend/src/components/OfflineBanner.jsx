import { useEffect, useState } from "react"

export default function OfflineBanner() {
  const [online,    setOnline]    = useState(navigator.onLine)
  const [syncing,   setSyncing]   = useState(false)
  const [queued,    setQueued]    = useState(0)
  const [showSynced,setShowSynced]= useState(false)

  useEffect(() => {
    function goOnline()  {
      setOnline(true)
      // Trigger background sync
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage("SYNC_NOW")
        setSyncing(true)
      }
    }
    function goOffline() { setOnline(false) }

    window.addEventListener("online",  goOnline)
    window.addEventListener("offline", goOffline)

    // Listen for sync complete from SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", e => {
        if (e.data?.type === "SYNC_COMPLETE") {
          setSyncing(false)
          setQueued(0)
          setShowSynced(true)
          setTimeout(() => setShowSynced(false), 3000)
        }
      })
    }

    // Check queued items count
    async function checkQueue() {
      try {
        const db = await openIDB()
        const tx = db.transaction("queue", "readonly")
        const count = await new Promise((res, rej) => {
          const req = tx.objectStore("queue").count()
          req.onsuccess = () => res(req.result)
          req.onerror   = () => rej(0)
        })
        setQueued(count)
      } catch {}
    }
    checkQueue()
    const interval = setInterval(checkQueue, 10000)

    return () => {
      window.removeEventListener("online",  goOnline)
      window.removeEventListener("offline", goOffline)
      clearInterval(interval)
    }
  }, [])

  if (online && !syncing && !showSynced && queued === 0) return null

  return (
    <div style={{
      position:"fixed", top: 0, left:0, right:0, zIndex:1000,
      padding:"6px 16px",
      background: !online      ? "#E24B4A" :
                  syncing      ? "#EF9F27" :
                  showSynced   ? "#1D9E75" : "#EF9F27",
      color:"#fff", fontSize:11, fontWeight:500,
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      transition:"background 0.3s",
    }}>
      {!online && (
        <>
          <span>📵</span>
          <span>You are offline — app works normally, data will sync when internet returns</span>
          {queued > 0 && <span className="opacity-75">({queued} actions queued)</span>}
        </>
      )}
      {online && syncing && (
        <>
          <span>🔄</span>
          <span>Back online — syncing {queued} pending actions...</span>
        </>
      )}
      {online && showSynced && (
        <>
          <span>✅</span>
          <span>All data synced successfully!</span>
        </>
      )}
    </div>
  )
}

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("dukaanai-offline", 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore("queue", { keyPath:"id" })
    req.onsuccess = e => res(e.target.result)
    req.onerror   = e => rej(e.target.error)
  })
}
