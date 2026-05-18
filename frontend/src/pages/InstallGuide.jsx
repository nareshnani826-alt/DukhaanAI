import { useState, useEffect } from "react"

function detectDevice() {
  const ua = navigator.userAgent
  const isIOS     = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)
  const isChrome  = /chrome/i.test(ua) && !/edge/i.test(ua)
  const isSafari  = /safari/i.test(ua) && !/chrome/i.test(ua)
  const isPWA     = window.matchMedia("(display-mode: standalone)").matches
  return { isIOS, isAndroid, isChrome, isSafari, isPWA }
}

export default function InstallGuide() {
  const [device,   setDevice]   = useState({})
  const [step,     setStep]     = useState(0)
  const [installed,setInstalled]= useState(false)
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    const d = detectDevice()
    setDevice(d)
    setInstalled(d.isPWA)
  }, [])

  function copyLink() {
    navigator.clipboard.writeText("https://dukhaan-ai.vercel.app")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({
        title: "DukaanAI — Inventory & Billing",
        text: "Kirana shop ke liye best free app! Voice mein inventory manage karo.",
        url: "https://dukhaan-ai.vercel.app"
      })
    } else {
      copyLink()
    }
  }

  const ANDROID_STEPS = [
    {
      icon: "1️⃣",
      title: "Open Chrome browser",
      desc: "Make sure you are using Chrome (not Firefox or other browsers)",
      tip: "Chrome has the DukaanAI icon on it — blue circle with colorful dots",
      img: "🌐"
    },
    {
      icon: "2️⃣",
      title: "Open DukaanAI website",
      desc: "Type this in Chrome address bar:",
      highlight: "dukhaan-ai.vercel.app",
      tip: "Or tap the Share button below to send the link to yourself on WhatsApp",
      img: "🔗"
    },
    {
      icon: "3️⃣",
      title: "Tap the 3 dots menu",
      desc: "In Chrome, tap the 3 dots (⋮) at the top right corner of the screen",
      tip: "It's the menu button at the very top right",
      img: "⋮"
    },
    {
      icon: "4️⃣",
      title: "Tap 'Add to Home Screen'",
      desc: "Scroll down in the menu and tap 'Add to Home Screen'",
      tip: "You might need to scroll down a little in the menu to find this option",
      img: "📱"
    },
    {
      icon: "5️⃣",
      title: "Tap 'Add'",
      desc: "A popup appears asking to confirm. Tap 'Add' button",
      tip: "DukaanAI icon will appear on your home screen!",
      img: "✅"
    },
  ]

  const IOS_STEPS = [
    {
      icon: "1️⃣",
      title: "Open Safari browser",
      desc: "Must use Safari (not Chrome) on iPhone for installation",
      tip: "Safari is the blue compass icon that comes with your iPhone",
      img: "🧭"
    },
    {
      icon: "2️⃣",
      title: "Open DukaanAI website",
      desc: "Type this in Safari address bar:",
      highlight: "dukhaan-ai.vercel.app",
      tip: "Or tap Share below to send the link to yourself",
      img: "🔗"
    },
    {
      icon: "3️⃣",
      title: "Tap the Share button",
      desc: "Tap the Share button at the bottom of Safari — it looks like a box with an arrow pointing up ↑",
      tip: "It's at the bottom center of the Safari browser",
      img: "⬆️"
    },
    {
      icon: "4️⃣",
      title: "Tap 'Add to Home Screen'",
      desc: "Scroll down in the share menu and tap 'Add to Home Screen'",
      tip: "You might need to scroll down to find this option",
      img: "📱"
    },
    {
      icon: "5️⃣",
      title: "Tap 'Add'",
      desc: "Tap 'Add' at the top right corner of the screen",
      tip: "DukaanAI icon will appear on your iPhone home screen!",
      img: "✅"
    },
  ]

  const steps = device.isIOS ? IOS_STEPS : ANDROID_STEPS

  if (installed) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-sm mx-auto text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">
            DukaanAI is installed!
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            You're already using the app version. All features including voice agent work perfectly!
          </p>
          <div className="card mb-4 text-left">
            <div className="text-xs font-semibold text-gray-700 mb-3">Share with other vendors</div>
            <p className="text-xs text-gray-500 mb-3">
              Help other kirana shop owners by sharing DukaanAI with them. It's completely free!
            </p>
            <button onClick={shareLink}
              className="btn btn-primary w-full py-3 text-sm font-semibold">
              📤 Share DukaanAI on WhatsApp
            </button>
          </div>
          <div className="card text-left">
            <div className="text-xs font-semibold text-gray-700 mb-2">App link</div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
              <span className="text-xs text-gray-600 flex-1">dukhaan-ai.vercel.app</span>
              <button onClick={copyLink}
                className="text-xs font-medium text-primary">
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3 text-3xl">
          🏪
        </div>
        <h1 className="text-base font-bold text-gray-800 mb-1">
          Install DukaanAI on your phone
        </h1>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Works like a real app — home screen icon, works offline, voice agent, all features free!
        </p>
      </div>

      {/* Device detected */}
      <div className="card mb-4 bg-primary-light border-primary/20">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{device.isIOS ? "🍎" : "🤖"}</span>
          <div>
            <div className="text-xs font-semibold text-primary-dark">
              {device.isIOS ? "iPhone detected" : "Android detected"}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {device.isIOS
                ? "Follow Safari steps below"
                : "Follow Chrome steps below"}
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {steps.map((s, i) => (
          <div key={i}
            onClick={() => setStep(i)}
            className={`card cursor-pointer transition-all ${
              step === i ? "border-primary shadow-md" : "border-gray-100"
            }`}
            style={step === i ? { borderColor:"#1D9E75", borderWidth:1.5 } : {}}>
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">{s.img}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-800">{s.title}</span>
                </div>
                <div className="text-[11px] text-gray-500">{s.desc}</div>
                {s.highlight && (
                  <div className="mt-2 bg-gray-900 text-green-400 rounded-lg px-3 py-2 font-mono text-xs">
                    {s.highlight}
                  </div>
                )}
                {step === i && (
                  <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-amber-700">💡 {s.tip}</div>
                  </div>
                )}
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                step > i ? "bg-primary text-white" : step === i ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {step > i ? "✓" : i + 1}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 mb-4">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="btn flex-1 py-3 text-sm">
            ← Previous
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="btn btn-primary flex-1 py-3 text-sm font-semibold">
            Next step →
          </button>
        ) : (
          <button onClick={() => setInstalled(true)}
            className="btn btn-primary flex-1 py-3 text-sm font-semibold">
            ✅ I installed it!
          </button>
        )}
      </div>

      {/* Share section */}
      <div className="card">
        <div className="text-xs font-semibold text-gray-700 mb-3">
          📤 Share with other vendors
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-600 font-mono">
            dukhaan-ai.vercel.app
          </div>
          <button onClick={copyLink}
            className="btn btn-sm px-3 py-2">
            {copied ? "✓" : "Copy"}
          </button>
        </div>
        <button onClick={shareLink}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background:"#25D366" }}>
          📲 Share on WhatsApp
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          DukaanAI is free for all vendors — help others by sharing!
        </p>
      </div>
    </div>
  )
}
