// ─────────────────────────────────────────────────────────
// ui/auth.js  —  Login / Register modal UI
// Drop this into your HTML and call AuthUI.show()
// ─────────────────────────────────────────────────────────

import { authApi } from "../api/auth.js";
import { hasLocalData } from "../sync/migrate.js";
import { migrateLocalToCloud } from "../sync/migrate.js";

export const AuthUI = {

  show(mode = "login") {
    // Remove existing modal if any
    document.getElementById("dukaanai-auth-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "dukaanai-auth-modal";
    modal.innerHTML = this._html(mode);
    document.body.appendChild(modal);

    // Wire up tab switching
    modal.querySelector("#tab-login")?.addEventListener("click",  () => this.show("login"));
    modal.querySelector("#tab-register")?.addEventListener("click", () => this.show("register"));
    modal.querySelector("#auth-submit")?.addEventListener("click",  () => this._submit(mode));
    modal.querySelector("#auth-skip")?.addEventListener("click",   () => this.hide());

    modal.querySelector("#auth-form")?.addEventListener("keydown", e => {
      if (e.key === "Enter") this._submit(mode);
    });
  },

  hide() {
    document.getElementById("dukaanai-auth-modal")?.remove();
  },

  async _submit(mode) {
    const btn = document.getElementById("auth-submit");
    const err = document.getElementById("auth-error");
    btn.disabled = true;
    btn.textContent = "Please wait...";
    err.textContent = "";

    try {
      if (mode === "login") {
        await authApi.login({
          email: document.getElementById("auth-email").value,
          password: document.getElementById("auth-password").value,
        });
      } else {
        await authApi.register({
          email: document.getElementById("auth-email").value,
          password: document.getElementById("auth-password").value,
          store_name: document.getElementById("auth-store").value,
          phone: document.getElementById("auth-phone").value,
          gstin: document.getElementById("auth-gstin").value,
        });
      }

      this.hide();
      window.dispatchEvent(new CustomEvent("dukaanai:login"));

      // Offer migration if they have local data
      if (hasLocalData()) {
        this._showMigratePrompt();
      }
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false;
      btn.textContent = mode === "login" ? "Login" : "Create account";
    }
  },

  _showMigratePrompt() {
    const banner = document.createElement("div");
    banner.id = "migrate-banner";
    banner.style.cssText = `
      position:fixed;bottom:20px;right:20px;background:#1D9E75;color:#fff;
      padding:14px 18px;border-radius:10px;font-size:13px;z-index:9999;
      max-width:320px;line-height:1.5;box-shadow:0 4px 12px rgba(0,0,0,.2)
    `;
    banner.innerHTML = `
      <b>You have local data!</b><br>
      Upload your existing products and invoices to the cloud?<br>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="migrate-yes" style="background:#fff;color:#1D9E75;border:none;border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer;font-weight:600">Upload now</button>
        <button id="migrate-no"  style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:6px;padding:5px 14px;font-size:12px;cursor:pointer">Skip</button>
      </div>
    `;
    document.body.appendChild(banner);

    banner.querySelector("#migrate-yes").addEventListener("click", async () => {
      banner.innerHTML = `<b>Uploading your data...</b><div id="migrate-log" style="font-size:11px;margin-top:6px;opacity:.8"></div>`;
      const log = banner.querySelector("#migrate-log");
      const { migrated, errors } = await migrateLocalToCloud(msg => { log.textContent = msg; });
      banner.innerHTML = `✓ Migration complete! ${migrated} records uploaded to cloud.<br><small style="opacity:.7">Page will reload in 2s</small>`;
      setTimeout(() => { banner.remove(); window.location.reload(); }, 2000);
    });

    banner.querySelector("#migrate-no").addEventListener("click", () => banner.remove());
  },

  _html(mode) {
    const isLogin = mode === "login";
    return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:14px;padding:28px;width:360px;max-width:95vw;font-family:sans-serif">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:22px;font-weight:600;color:#1D9E75">DukaanAI</div>
          <div style="font-size:12px;color:#888;margin-top:2px">Cloud sync for your store</div>
        </div>

        <div style="display:flex;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:18px;overflow:hidden">
          <button id="tab-login"    style="flex:1;padding:8px;border:none;background:${isLogin  ? "#1D9E75" : "#fff"};color:${isLogin  ? "#fff" : "#666"};font-size:12px;font-weight:500;cursor:pointer">Login</button>
          <button id="tab-register" style="flex:1;padding:8px;border:none;background:${!isLogin ? "#1D9E75" : "#fff"};color:${!isLogin ? "#fff" : "#666"};font-size:12px;font-weight:500;cursor:pointer">Register</button>
        </div>

        <div id="auth-form" style="display:flex;flex-direction:column;gap:10px">
          ${!isLogin ? `
          <div>
            <label style="font-size:11px;color:#666;font-weight:500">Store Name *</label>
            <input id="auth-store" placeholder="e.g. Sharma General Stores" style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
          </div>` : ""}

          <div>
            <label style="font-size:11px;color:#666;font-weight:500">Email *</label>
            <input id="auth-email" type="email" placeholder="you@example.com" style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
          </div>

          <div>
            <label style="font-size:11px;color:#666;font-weight:500">Password *</label>
            <input id="auth-password" type="password" placeholder="Min 8 characters" style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
          </div>

          ${!isLogin ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="font-size:11px;color:#666;font-weight:500">Phone</label>
              <input id="auth-phone" placeholder="9876543210" style="width:100%;margin-top:3px;padding:9px 10px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:11px;color:#666;font-weight:500">GSTIN</label>
              <input id="auth-gstin" placeholder="Optional" style="width:100%;margin-top:3px;padding:9px 10px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
            </div>
          </div>` : ""}

          <div id="auth-error" style="color:#dc2626;font-size:12px;min-height:16px"></div>

          <button id="auth-submit" style="background:#1D9E75;color:#fff;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;margin-top:4px">
            ${isLogin ? "Login" : "Create account"}
          </button>

          <button id="auth-skip" style="background:transparent;border:none;color:#999;font-size:11px;cursor:pointer;padding:4px">
            Continue without account (free local mode)
          </button>
        </div>
      </div>
    </div>`;
  },
};
