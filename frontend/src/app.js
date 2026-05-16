// ─────────────────────────────────────────────────────────
// app.js  —  Main entry point
//
// Import this in your index.html like:
//   <script type="module" src="src/app.js"></script>
//
// Then in your existing DukaanAI UI code, replace all
// direct localStorage calls with the dataStore helpers:
//
//   BEFORE:  const data = JSON.parse(localStorage.getItem(...))
//   AFTER:   const products = await Products.list()
//
//   BEFORE:  data.products.push(newProduct); localStorage.setItem(...)
//   AFTER:   await Products.create(newProduct)
// ─────────────────────────────────────────────────────────

import { Products, Sales, Invoices, SyncStatus } from "./sync/dataStore.js";
import { authApi } from "./api/auth.js";
import { AuthUI } from "./ui/auth.js";

// ── Export everything the UI needs ───────────────────────
window.DukaanAI = {
  Products,
  Sales,
  Invoices,
  SyncStatus,
  AuthUI,
  authApi,
};

// ── Sync mode indicator in the UI ────────────────────────
function updateSyncBadge() {
  const badge = document.getElementById("sync-mode-badge");
  if (!badge) return;
  const mode = SyncStatus.getMode();
  const vendor = window.DukaanAI.authApi ? JSON.parse(localStorage.getItem("dukaanai_vendor") || "null") : null;

  if (mode === "cloud") {
    badge.innerHTML = `<span style="color:#1D9E75">● Cloud sync ON</span> — ${vendor?.store_name || ""}`;
  } else if (window.DukaanAI.authApi && localStorage.getItem("dukaanai_access_token")) {
    badge.innerHTML = `<span style="color:#BA7517">● Free plan</span> — <a href="#" id="upgrade-link" style="color:#185FA5">Upgrade to Pro</a>`;
    document.getElementById("upgrade-link")?.addEventListener("click", e => {
      e.preventDefault();
      window.open("http://localhost:8000/subscriptions/plans", "_blank");
    });
  } else {
    badge.innerHTML = `<span style="color:#888">● Local only</span> — <a href="#" id="login-link" style="color:#185FA5">Login for cloud sync</a>`;
    document.getElementById("login-link")?.addEventListener("click", e => {
      e.preventDefault();
      AuthUI.show("login");
    });
  }
}

// ── Global event handlers ─────────────────────────────────
window.addEventListener("dukaanai:login",  () => { updateSyncBadge(); });
window.addEventListener("dukaanai:logout", () => {
  authApi.logout();
  updateSyncBadge();
  window.location.reload();
});

// ── On page load ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateSyncBadge();

  // Show login prompt if not logged in and has been using app for a while
  const usageCount = parseInt(localStorage.getItem("dukaanai_usage_count") || "0") + 1;
  localStorage.setItem("dukaanai_usage_count", usageCount);

  // Nudge after 5 sessions
  if (usageCount === 5 && !localStorage.getItem("dukaanai_access_token")) {
    setTimeout(() => {
      const nudge = document.createElement("div");
      nudge.style.cssText = `
        position:fixed;bottom:20px;right:20px;background:#185FA5;color:#fff;
        padding:14px 18px;border-radius:10px;font-size:13px;z-index:9999;
        max-width:280px;line-height:1.5
      `;
      nudge.innerHTML = `
        <b>Back again!</b> Create a free account to backup your data to the cloud.<br>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="window.DukaanAI.AuthUI.show('register');this.closest('div').remove()" 
            style="background:#fff;color:#185FA5;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:600">Sign up free</button>
          <button onclick="this.closest('div').remove()" 
            style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer">Later</button>
        </div>
      `;
      document.body.appendChild(nudge);
      setTimeout(() => nudge.remove(), 8000);
    }, 2000);
  }
});
