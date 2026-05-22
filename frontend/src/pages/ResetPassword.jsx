import { useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { api } from "../sync/db"

export default function ResetPassword() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get("token") || ""

  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [pwErr,     setPwErr]     = useState("")
  const [cnfErr,    setCnfErr]    = useState("")
  const [msg,       setMsg]       = useState("")
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  async function submit() {
    setPwErr(""); setCnfErr("")
    if (!password)         { setPwErr("New password is required"); return }
    if (password.length < 8) { setPwErr("Password must be at least 8 characters"); return }
    if (!confirm)          { setCnfErr("Please confirm your password"); return }
    if (password !== confirm) { setCnfErr("Passwords do not match"); return }

    setLoading(true)
    try {
      const res = await api.post("/auth/reset-password", { token, new_password: password })
      setMsg(res.message)
      setDone(true)
    } catch(e) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="min-h-screen bg-[#FDFAF5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">🔗</div>
        <div className="text-base font-semibold text-gray-700 mb-1">Invalid Reset Link</div>
        <div className="text-xs text-gray-400 mb-5">This link is missing a token. Please use the link from your email.</div>
        <button onClick={() => navigate("/")}
          className="text-sm text-primary underline bg-transparent border-none cursor-pointer">
          Back to App
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FDFAF5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔒</div>
          <div className="text-base font-semibold text-primary">Reset Your Password</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Enter a new password for your DukaanAI account</div>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="text-sm text-green-700 font-medium">{msg}</p>
            <button onClick={() => navigate("/")}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors">
              Go to App & Login
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">New Password *</label>
              <input
                className={`input ${pwErr ? "border-red-400 focus:border-red-400" : ""}`}
                type="password" placeholder="Min 8 characters"
                value={password}
                onChange={e => { setPassword(e.target.value); setPwErr("") }}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              {pwErr && <p className="text-red-500 text-[10px] mt-0.5">{pwErr}</p>}
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <input
                className={`input ${cnfErr ? "border-red-400 focus:border-red-400" : ""}`}
                type="password" placeholder="Re-enter password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setCnfErr("") }}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              {cnfErr && <p className="text-red-500 text-[10px] mt-0.5">{cnfErr}</p>}
            </div>
            {msg && <p className="text-red-500 text-[11px]">{msg}</p>}
            <button onClick={submit} disabled={loading}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60 transition-colors">
              {loading ? "Updating..." : "Reset Password"}
            </button>
            <button onClick={() => navigate("/")}
              className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1 bg-transparent border-none cursor-pointer">
              Cancel — Back to App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
