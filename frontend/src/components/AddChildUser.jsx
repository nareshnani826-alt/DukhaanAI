import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../sync/db";

export default function AddChildUser() {
  const { vendor } = useAuth();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const roleOptions = [
    { value: "owner", label: "Owner", desc: "Full access to all features." },
    { value: "manager", label: "Manager", desc: "Manage staff, inventory, and sales." },
    { value: "cashier", label: "Cashier", desc: "Billing and sales only." },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await api.post("/admin/add-child-user", {
        parent_id: vendor.id,
        username,
        role,
      });
      setSuccess(true);
      setUsername("");
      setRole("");
    } catch (e) {
      setError(e.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-4 p-6 shadow-lg rounded-xl bg-white">
      <h2 className="text-base font-bold mb-1 flex items-center gap-2">
        <span role="img" aria-label="staff">👥</span> Add Staff Member
      </h2>
      <div className="text-xs text-gray-500 mb-4">Invite a new staff member to your shop and assign their role.</div>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs mb-1 font-medium">Username</label>
          <input
            className="input w-full"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            placeholder="Enter staff username"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs mb-1 font-medium">Role</label>
          <select
            className="input w-full"
            value={role}
            onChange={e => setRole(e.target.value)}
            required
          >
            <option value="" disabled>Select role</option>
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary min-w-[140px]" type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Staff"}
        </button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
        {roleOptions.map(opt => (
          <div key={opt.value} className="rounded-lg border p-2 text-xs bg-gray-50">
            <div className="font-semibold mb-1">{opt.label}</div>
            <div className="text-gray-500">{opt.desc}</div>
          </div>
        ))}
      </div>
      {success && <div className="text-green-600 text-xs mt-3">User added successfully!</div>}
      {error && <div className="text-red-600 text-xs mt-3">{error}</div>}
    </div>
  );
}
