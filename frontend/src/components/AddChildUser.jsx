import { useEffect, useState } from "react";
import { api } from "../sync/db";
import { tr, uiLang } from "../i18n/kiranaStrings"

const L = k => tr(k, uiLang())

const roleOptions = [
  { value: "manager", label: "Manager", desc: "Stock, sales and reports. Can't change staff or plan." },
  { value: "cashier", label: "Cashier", desc: "Billing and sales only." },
];

// Owner adds staff with a username + 4-digit PIN. Staff sign in from the
// "Staff" tab on the login screen using the shop's phone/email.
export default function AddChildUser() {
  const [staff, setStaff] = useState([]);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("cashier");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = () => api.get("/staff").then(setStaff).catch(e => setError(e.message));
  useEffect(() => { load() }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return setError(L("PIN must be 4 digits"));
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const s = await api.post("/staff", { username, pin, role });
      setSuccess(`${s.username} ${L("added")}. ${L("They sign in from the Staff tab with your shop phone, their username and PIN.")}`);
      setUsername("");
      setPin("");
      load();
    } catch (e) {
      setError(e.message || L("Failed to add user"));
    } finally {
      setLoading(false);
    }
  };

  async function remove(s) {
    if (!window.confirm(`${L("Remove")} ${s.username}?`)) return;
    try { await api.del(`/staff/${s.id}`); load() }
    catch (e) { setError(e.message) }
  }

  async function resetPin(s) {
    const p = window.prompt(`${L("New 4-digit PIN for")} ${s.username}`);
    if (p == null) return;
    if (!/^\d{4}$/.test(p)) return setError(L("PIN must be 4 digits"));
    try { await api.patch(`/staff/${s.id}`, { pin: p }); setSuccess(`${L("PIN changed for")} ${s.username}`) }
    catch (e) { setError(e.message) }
  }

  return (
    <div className="card mb-4 p-6 shadow-lg rounded-xl bg-white">
      <h2 className="text-base font-bold mb-1 flex items-center gap-2">
        <span role="img" aria-label="staff">👥</span> {L("Add Staff Member")}
      </h2>
      <div className="text-xs text-gray-500 mb-4">{L("Invite a new staff member to your shop and assign their role.")}</div>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs mb-1 font-medium">{L("Username")}</label>
          <input
            className="input w-full"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoCapitalize="none"
            placeholder={L("Enter staff username")}
          />
        </div>
        <div className="md:w-32">
          <label className="block text-xs mb-1 font-medium">{L("PIN")}</label>
          <input
            className="input w-full"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            inputMode="numeric"
            placeholder="4 digits"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs mb-1 font-medium">{L("Role")}</label>
          <select className="input w-full" value={role} onChange={e => setRole(e.target.value)}>
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{L(opt.label)}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary min-w-[140px]" type="submit" disabled={loading}>
          {L(loading ? "Adding..." : "Add Staff")}
        </button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        {roleOptions.map(opt => (
          <div key={opt.value} className="rounded-lg border p-2 text-xs bg-gray-50">
            <div className="font-semibold mb-1">{L(opt.label)}</div>
            <div className="text-gray-500">{L(opt.desc)}</div>
          </div>
        ))}
      </div>
      {success && <div className="text-green-600 text-xs mt-3">{success}</div>}
      {error && <div className="text-red-600 text-xs mt-3">{error}</div>}

      {staff.length > 0 && (
        <div className="mt-4 border-t pt-3">
          {staff.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-semibold flex-1 min-w-0 truncate">{s.username}</span>
              <span className="text-xs text-gray-500">{L(s.role === "manager" ? "Manager" : "Cashier")}</span>
              <button type="button" className="text-xs underline text-gray-600" onClick={() => resetPin(s)}>{L("Change PIN")}</button>
              <button type="button" className="text-xs underline text-red-600" onClick={() => remove(s)}>{L("Remove")}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
