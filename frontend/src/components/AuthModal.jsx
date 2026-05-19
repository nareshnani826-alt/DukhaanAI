import { useState } from "react"
import { useAuth } from "../context/AuthContext"

export default function AuthModal({ onClose }) {
  const { login, register, loading, error, setError } = useAuth()
  const [mode, setMode] = useState("login")
  const [form, setForm] = useState({ email:"", password:"", store_name:"", phone:"", gstin:"" })

  const set = (k, v) => { setForm(f => ({...f, [k]:v})); setError("") }

  async function submit() {
    try {
      if (mode === "login") await login(form.email, form.password)
      else await register(form)
      onClose()
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-fade-in" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-xl animate-slide-up">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-base font-semibold text-primary">DukaanAI Cloud</div>
            <div className="text-[10px] text-gray-400">Sync your data across devices</div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError("") }}
              className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${mode===m ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}>
              {m === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {mode === "register" && (
            <div>
              <label className="label">Store Name *</label>
              <input className="input" placeholder="Sharma General Stores" value={form.store_name} onChange={e => set("store_name", e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" placeholder="you@store.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => set("password", e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} />
          </div>
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Phone</label><input className="input" placeholder="9876543210" value={form.phone} onChange={e => set("phone",e.target.value)} /></div>
              <div><label className="label">GSTIN</label><input className="input" placeholder="Optional" value={form.gstin} onChange={e => set("gstin",e.target.value)} /></div>
            </div>
          )}
          {error && <div className="text-red-500 text-[11px]">{error}</div>}
          <button onClick={submit} disabled={loading}
            className="w-full py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60 transition-colors">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
          <button onClick={onClose} className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1">
            Continue without account (free local mode)
          </button>
        </div>
      </div>
    </div>
  )
}
