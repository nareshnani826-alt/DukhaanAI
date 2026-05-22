import { useState, useRef, useEffect } from "react"
import { useAuth } from "../context/AuthContext"

const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isValidPhone = v => /^(\+91|0|91)?[6-9]\d{9}$/.test(v.replace(/\s/g, ""))

export default function AuthModal({ onClose }) {
  const { login, register, sendOtp, verifyOtp, forgotPassword, loading, error, setError } = useAuth()
  const [mode, setMode]       = useState("login")   // login | register | otp | forgot
  const [form, setForm]       = useState({ identifier: "", password: "", store_name: "", phone: "", gstin: "" })
  const [modules, setModules] = useState(["kirana"])
  const [remember, setRemember] = useState(true)
  const [fieldErr, setFieldErr] = useState({})
  // OTP state
  const [otpPhone, setOtpPhone]       = useState("")
  const [otpPhoneErr, setOtpPhoneErr] = useState("")
  const [otpStep, setOtpStep]         = useState(1)   // 1=enter phone, 2=enter code
  const [otpCode, setOtpCode]         = useState("")
  const [otpCodeErr, setOtpCodeErr]   = useState("")
  const [countdown, setCountdown]     = useState(0)
  // Forgot state
  const [fpEmail, setFpEmail]   = useState("")
  const [fpErr, setFpErr]       = useState("")
  const [fpMsg, setFpMsg]       = useState("")
  const timerRef = useRef(null)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(""); setFieldErr(e => ({ ...e, [k]: "" })) }

  function switchMode(m) { setMode(m); setError(""); setFieldErr({}); setFpMsg(""); setFpErr("") }

  // ── Password login / register ──────────────────────────
  async function submit() {
    const errs = {}
    if (!form.identifier) {
      errs.identifier = mode === "login" ? "Email or phone is required" : "Email is required"
    } else if (mode === "login") {
      if (!isValidEmail(form.identifier) && !isValidPhone(form.identifier))
        errs.identifier = "Enter a valid email or 10-digit phone number"
    } else if (!isValidEmail(form.identifier)) {
      errs.identifier = "Enter a valid email address"
    }
    if (!form.password) errs.password = "Password is required"
    else if (mode === "register" && form.password.length < 8)
      errs.password = "Password must be at least 8 characters"
    if (mode === "register" && !form.store_name) errs.store_name = "Store name is required"
    if (Object.keys(errs).length) { setFieldErr(errs); return }

    try {
      if (mode === "login") await login(form.identifier, form.password, remember)
      else await register({ ...form, email: form.identifier, modules })
      onClose()
    } catch {}
  }

  // ── WhatsApp OTP ───────────────────────────────────────
  function startCountdown() {
    clearInterval(timerRef.current)
    setCountdown(30)
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0 } return c - 1 })
    }, 1000)
  }
  useEffect(() => () => clearInterval(timerRef.current), [])

  async function handleSendOtp() {
    setOtpPhoneErr("")
    if (!otpPhone) { setOtpPhoneErr("Phone number is required"); return }
    if (!isValidPhone(otpPhone)) { setOtpPhoneErr("Enter a valid 10-digit Indian mobile number"); return }
    try {
      await sendOtp(otpPhone)
      setOtpStep(2); setOtpCode(""); setOtpCodeErr(""); startCountdown()
    } catch(e) { setOtpPhoneErr(e.message) }
  }

  async function handleVerifyOtp() {
    setOtpCodeErr("")
    if (!otpCode || otpCode.length !== 6) { setOtpCodeErr("Enter the 6-digit OTP"); return }
    try {
      await verifyOtp(otpPhone, otpCode, remember)
      onClose()
    } catch(e) { setOtpCodeErr(e.message) }
  }

  // ── Forgot password ────────────────────────────────────
  async function handleForgotPassword() {
    setFpErr(""); setFpMsg("")
    if (!fpEmail) { setFpErr("Email is required"); return }
    if (!isValidEmail(fpEmail)) { setFpErr("Enter a valid email address"); return }
    try {
      const res = await forgotPassword(fpEmail)
      setFpMsg(res.message)
    } catch(e) { setFpErr(e.message) }
  }

  const inputCls = (k) =>
    `input ${fieldErr[k] ? "border-red-400 focus:border-red-400" : ""}`

  // ── Render ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-xl animate-slide-up">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-base font-semibold text-primary">DukaanAI Cloud</div>
            <div className="text-[10px] text-gray-400">Sync your data across devices</div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
          {[["login","Login"], ["register","Register"]].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${mode === m ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Login / Register form ── */}
        {(mode === "login" || mode === "register") && (
          <div className="space-y-2.5">
            {mode === "register" && (
              <div>
                <label className="label">Store Name *</label>
                <input className={inputCls("store_name")} placeholder="Sharma General Stores"
                  value={form.store_name} onChange={e => set("store_name", e.target.value)} />
                {fieldErr.store_name && <p className="text-red-500 text-[10px] mt-0.5">{fieldErr.store_name}</p>}
              </div>
            )}
            <div>
              <label className="label">{mode === "login" ? "Email or Phone *" : "Email *"}</label>
              <input className={inputCls("identifier")}
                type={mode === "login" ? "text" : "email"}
                placeholder={mode === "login" ? "you@store.com or 9876543210" : "you@store.com"}
                value={form.identifier} onChange={e => set("identifier", e.target.value)} />
              {fieldErr.identifier && <p className="text-red-500 text-[10px] mt-0.5">{fieldErr.identifier}</p>}
            </div>
            <div>
              <label className="label">Password *</label>
              <input className={inputCls("password")} type="password" placeholder="Min 8 characters"
                value={form.password} onChange={e => set("password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()} />
              {fieldErr.password && <p className="text-red-500 text-[10px] mt-0.5">{fieldErr.password}</p>}
            </div>
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Phone</label>
                  <input className="input" placeholder="9876543210" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
                <div><label className="label">GSTIN</label>
                  <input className="input" placeholder="Optional" value={form.gstin} onChange={e => set("gstin", e.target.value)} /></div>
              </div>
            )}
            {mode === "register" && (
              <div>
                <label className="label">Store Type *</label>
                <div className="flex flex-col gap-1.5 mt-1">
                  {[
                    { id: "kirana",       label: "Kirana / Grocery store",  icon: "🛒" },
                    { id: "bangle_fancy", label: "Bangles / Fancy store",   icon: "💍" },
                  ].map(({ id, label, icon }) => {
                    const checked = modules.includes(id)
                    return (
                      <label key={id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border transition-colors"
                        style={{ borderColor: checked ? "var(--jade, #1D9E75)" : "#e5e7eb",
                          background: checked ? "#f0faf6" : "white" }}>
                        <input type="checkbox" className="accent-primary w-3.5 h-3.5"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) setModules(m => [...m, id])
                            else setModules(m => m.filter(x => x !== id))
                          }} />
                        <span className="text-base">{icon}</span>
                        <span className="text-[11px] font-medium text-gray-700">{label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            {mode === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="accent-primary w-3.5 h-3.5" />
                  Remember me
                </label>
                <button onClick={() => switchMode("forgot")}
                  className="text-[11px] text-primary underline bg-transparent border-none cursor-pointer">
                  Forgot password?
                </button>
              </div>
            )}
            {error && <p className="text-red-500 text-[11px]">{error}</p>}
            <button onClick={submit} disabled={loading}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60 transition-colors">
              {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
            </button>
            <button onClick={onClose} className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1">
              Continue without account (free local mode)
            </button>
          </div>
        )}

        {/* ── WhatsApp OTP ── */}
        {mode === "otp" && (
          <div className="space-y-2.5">
            <div className="text-center py-1">
              <div className="text-xl">💬</div>
              <div className="text-[11px] text-gray-500 mt-1">We'll send a 6-digit code to your WhatsApp</div>
            </div>

            {otpStep === 1 ? (
              <>
                <div>
                  <label className="label">Phone Number *</label>
                  <input className={`input ${otpPhoneErr ? "border-red-400" : ""}`} type="tel"
                    placeholder="9876543210" value={otpPhone}
                    onChange={e => { setOtpPhone(e.target.value); setOtpPhoneErr("") }}
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()} />
                  {otpPhoneErr && <p className="text-red-500 text-[10px] mt-0.5">{otpPhoneErr}</p>}
                </div>
                {error && <p className="text-red-500 text-[11px]">{error}</p>}
                <button onClick={handleSendOtp} disabled={loading}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-[#25D366] text-white disabled:opacity-60 transition-colors">
                  {loading ? "Sending..." : "Send OTP on WhatsApp"}
                </button>
              </>
            ) : (
              <>
                <p className="text-[11px] text-gray-500 text-center">OTP sent to <b>{otpPhone}</b></p>
                <div>
                  <label className="label">Enter 6-digit OTP *</label>
                  <input className={`input text-center text-xl tracking-[8px] ${otpCodeErr ? "border-red-400" : ""}`}
                    type="number" placeholder="••••••" maxLength={6}
                    value={otpCode} onChange={e => { setOtpCode(e.target.value.slice(0,6)); setOtpCodeErr("") }}
                    onKeyDown={e => e.key === "Enter" && handleVerifyOtp()} />
                  {otpCodeErr && <p className="text-red-500 text-[10px] mt-0.5">{otpCodeErr}</p>}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    className="accent-primary w-3.5 h-3.5" />
                  Remember me
                </label>
                {error && <p className="text-red-500 text-[11px]">{error}</p>}
                <button onClick={handleVerifyOtp} disabled={loading}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-primary text-white disabled:opacity-60 transition-colors">
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <div className="flex justify-between items-center">
                  <button disabled={countdown > 0} onClick={() => { setOtpStep(1); handleSendOtp() }}
                    className={`text-[11px] border-none bg-transparent cursor-pointer ${countdown > 0 ? "text-gray-300" : "text-primary underline"}`}>
                    {countdown > 0 ? `Resend (${countdown}s)` : "Resend OTP"}
                  </button>
                  <button onClick={() => { setOtpStep(1); setOtpCode("") }}
                    className="text-[11px] text-primary underline bg-transparent border-none cursor-pointer">
                    Change number
                  </button>
                </div>
              </>
            )}
            <button onClick={onClose} className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1">
              Continue without account (free local mode)
            </button>
          </div>
        )}

        {/* ── Forgot Password ── */}
        {mode === "forgot" && (
          <div className="space-y-2.5">
            <div className="text-center mb-1">
              <div className="text-sm font-semibold text-primary">Forgot Password?</div>
              <div className="text-[10px] text-gray-400">Enter your email to receive a reset link</div>
            </div>
            <div>
              <label className="label">Email *</label>
              <input className={`input ${fpErr ? "border-red-400" : ""}`} type="email"
                placeholder="you@store.com" value={fpEmail}
                onChange={e => { setFpEmail(e.target.value); setFpErr("") }}
                onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
              {fpErr && <p className="text-red-500 text-[10px] mt-0.5">{fpErr}</p>}
              {fpMsg && <p className="text-green-600 text-[10px] mt-0.5">{fpMsg}</p>}
            </div>
            <button onClick={handleForgotPassword} disabled={loading}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-primary text-white disabled:opacity-60 transition-colors">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <button onClick={() => switchMode("login")}
              className="w-full text-[11px] text-primary py-1 bg-transparent border-none cursor-pointer">
              ← Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
