// ─────────────────────────────────────────────────────────
// ui/auth.js  —  Login / Register modal UI
// ─────────────────────────────────────────────────────────

import { authApi } from "../api/auth.js";
import { hasLocalData } from "../sync/migrate.js";
import { migrateLocalToCloud } from "../sync/migrate.js";

export const AuthUI = {

  show(mode = "login") {
    document.getElementById("dukaanai-auth-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "dukaanai-auth-modal";
    modal.innerHTML = this._html(mode);
    document.body.appendChild(modal);

    modal.querySelector("#tab-login")?.addEventListener("click",    () => this.show("login"));
    modal.querySelector("#tab-register")?.addEventListener("click", () => this.show("register"));
    modal.querySelector("#tab-otp")?.addEventListener("click",      () => this._showOtpView());
    modal.querySelector("#auth-submit")?.addEventListener("click",  () => this._submit(mode));
    modal.querySelector("#auth-skip")?.addEventListener("click",    () => this.hide());
    modal.querySelector("#auth-forgot-link")?.addEventListener("click", () => this._showForgotView());

    modal.querySelector("#auth-form")?.addEventListener("keydown", e => {
      if (e.key === "Enter") this._submit(mode);
    });
  },

  hide() {
    document.getElementById("dukaanai-auth-modal")?.remove();
  },

  _setFieldError(id, message) {
    const el = document.getElementById(id);
    if (el) el.style.border = "1.5px solid #dc2626";
    const err = document.getElementById("auth-error");
    if (err && !err.textContent) err.textContent = message;
  },

  _clearErrors() {
    ["auth-email", "auth-password"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.border = "1px solid #ddd";
    });
    const err = document.getElementById("auth-error");
    if (err) err.textContent = "";
  },

  async _submit(mode) {
    this._clearErrors();

    const identifier = document.getElementById("auth-email")?.value.trim() ?? "";
    const password   = document.getElementById("auth-password")?.value ?? "";
    const btn        = document.getElementById("auth-submit");
    const err        = document.getElementById("auth-error");

    // Mandatory field validation
    let hasError = false;
    if (!identifier) {
      this._setFieldError("auth-email", mode === "login" ? "Email or phone is required" : "Email is required");
      hasError = true;
    } else if (mode === "login") {
      const isEmail = identifier.includes("@");
      const isPhone = /^(\+91|0|91)?[6-9]\d{9}$/.test(identifier.replace(/\s/g, ""));
      if (!isEmail && !isPhone) {
        this._setFieldError("auth-email", "Enter a valid email address or 10-digit phone number");
        hasError = true;
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      this._setFieldError("auth-email", "Enter a valid email address");
      hasError = true;
    }
    if (!password) {
      this._setFieldError("auth-password", hasError ? "" : "Password is required");
      if (!hasError) err.textContent = "Password is required";
      hasError = true;
    } else if (mode === "register" && password.length < 8) {
      this._setFieldError("auth-password", "");
      err.textContent = "Password must be at least 8 characters";
      hasError = true;
    }
    if (hasError) return;

    btn.disabled = true;
    btn.textContent = "Please wait...";

    try {
      if (mode === "login") {
        const remember = document.getElementById("auth-remember")?.checked ?? true;
        await authApi.login({ identifier, password, remember });
      } else {
        const storeName = document.getElementById("auth-store")?.value.trim() ?? "";
        if (!storeName) {
          err.textContent = "Store name is required";
          btn.disabled = false;
          btn.textContent = "Create account";
          return;
        }
        await authApi.register({
          email: identifier, password,
          store_name: storeName,
          phone: document.getElementById("auth-phone")?.value ?? "",
          gstin: document.getElementById("auth-gstin")?.value ?? "",
        });
      }

      this.hide();
      window.dispatchEvent(new CustomEvent("dukaanai:login"));

      if (hasLocalData()) this._showMigratePrompt();
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false;
      btn.textContent = mode === "login" ? "Login" : "Create account";
    }
  },

  _showForgotView() {
    const modal = document.getElementById("dukaanai-auth-modal");
    if (!modal) return;

    modal.querySelector(".auth-inner").innerHTML = `
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:20px;font-weight:600;color:#1D9E75">Forgot Password?</div>
        <div style="font-size:12px;color:#888;margin-top:3px">Enter your email and we'll send a reset link</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label style="font-size:11px;color:#666;font-weight:500">Email *</label>
          <input id="forgot-email" type="email" placeholder="you@example.com"
            style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
        </div>
        <div id="forgot-msg" style="font-size:12px;min-height:16px"></div>
        <button id="forgot-submit"
          style="background:#1D9E75;color:#fff;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:600;cursor:pointer">
          Send Reset Link
        </button>
        <button id="forgot-back"
          style="background:transparent;border:none;color:#1D9E75;font-size:12px;cursor:pointer;padding:4px">
          ← Back to Login
        </button>
      </div>`;

    modal.querySelector("#forgot-submit").addEventListener("click", () => this._submitForgot());
    modal.querySelector("#forgot-back").addEventListener("click",   () => this.show("login"));
    modal.querySelector("#forgot-email").addEventListener("keydown", e => {
      if (e.key === "Enter") this._submitForgot();
    });
  },

  async _submitForgot() {
    const emailEl = document.getElementById("forgot-email");
    const msgEl   = document.getElementById("forgot-msg");
    const btn     = document.getElementById("forgot-submit");
    const email   = emailEl?.value.trim() ?? "";

    emailEl.style.border = "1px solid #ddd";
    msgEl.style.color = "#dc2626";
    msgEl.textContent = "";

    if (!email) {
      emailEl.style.border = "1.5px solid #dc2626";
      msgEl.textContent = "Email is required";
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailEl.style.border = "1.5px solid #dc2626";
      msgEl.textContent = "Enter a valid email address";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending...";
    try {
      const res = await authApi.forgotPassword(email);
      msgEl.style.color = "#1D9E75";
      msgEl.textContent = res.message;
      btn.textContent = "Sent!";
    } catch (e) {
      msgEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = "Send Reset Link";
    }
  },

  _showOtpView(phone = "") {
    const inner = document.querySelector("#dukaanai-auth-modal .auth-inner");
    if (!inner) return;
    inner.innerHTML = `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:22px">💬</div>
        <div style="font-size:18px;font-weight:600;color:#1D9E75;margin-top:4px">Login with WhatsApp OTP</div>
        <div style="font-size:12px;color:#888;margin-top:3px">We'll send a 6-digit code to your WhatsApp</div>
      </div>
      <div id="otp-step-phone" style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label style="font-size:11px;color:#666;font-weight:500">Phone Number *</label>
          <input id="otp-phone" type="tel" placeholder="9876543210" value="${phone}"
            style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
        </div>
        <div id="otp-phone-msg" style="font-size:12px;color:#dc2626;min-height:16px"></div>
        <button id="otp-send-btn"
          style="background:#25D366;color:#fff;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:600;cursor:pointer">
          Send OTP on WhatsApp
        </button>
        <button id="otp-back-btn"
          style="background:transparent;border:none;color:#1D9E75;font-size:12px;cursor:pointer;padding:4px">
          ← Back to Login
        </button>
      </div>
      <div id="otp-step-verify" style="display:none;flex-direction:column;gap:10px">
        <div style="font-size:12px;color:#555;text-align:center">
          OTP sent to <b id="otp-phone-display"></b> on WhatsApp
        </div>
        <div>
          <label style="font-size:11px;color:#666;font-weight:500">Enter 6-digit OTP *</label>
          <input id="otp-code" type="number" placeholder="123456" maxlength="6"
            style="width:100%;margin-top:3px;padding:11px 12px;border:1px solid #ddd;border-radius:7px;font-size:18px;text-align:center;letter-spacing:6px;box-sizing:border-box">
        </div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#555;cursor:pointer">
          <input id="otp-remember" type="checkbox" checked style="accent-color:#1D9E75;width:14px;height:14px;cursor:pointer">
          Remember me
        </label>
        <div id="otp-verify-msg" style="font-size:12px;color:#dc2626;min-height:16px"></div>
        <button id="otp-verify-btn"
          style="background:#1D9E75;color:#fff;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:600;cursor:pointer">
          Verify OTP
        </button>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <button id="otp-resend-btn" disabled
            style="background:none;border:none;color:#aaa;font-size:12px;cursor:not-allowed;padding:0">
            Resend OTP (<span id="otp-countdown">30</span>s)
          </button>
          <button id="otp-change-phone"
            style="background:none;border:none;color:#1D9E75;font-size:12px;cursor:pointer;padding:0;text-decoration:underline">
            Change number
          </button>
        </div>
      </div>`;

    const sendBtn   = inner.querySelector("#otp-send-btn");
    const backBtn   = inner.querySelector("#otp-back-btn");
    const verifyBtn = inner.querySelector("#otp-verify-btn");
    const codeInput = inner.querySelector("#otp-code");

    sendBtn.addEventListener("click",   () => this._otpSendCode());
    backBtn.addEventListener("click",   () => this.show("login"));
    verifyBtn.addEventListener("click", () => this._otpVerifyCode());
    inner.querySelector("#otp-change-phone").addEventListener("click", () => {
      inner.querySelector("#otp-step-phone").style.display = "flex";
      inner.querySelector("#otp-step-verify").style.display = "none";
    });
    codeInput?.addEventListener("keydown", e => {
      if (e.key === "Enter") this._otpVerifyCode();
    });
  },

  _startResendCountdown() {
    let secs = 30;
    const btn       = document.getElementById("otp-resend-btn");
    const countdown = document.getElementById("otp-countdown");
    if (!btn || !countdown) return;
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
    btn.style.color = "#aaa";
    const interval = setInterval(() => {
      secs -= 1;
      if (countdown) countdown.textContent = secs;
      if (secs <= 0) {
        clearInterval(interval);
        if (btn) {
          btn.disabled = false;
          btn.style.cursor = "pointer";
          btn.style.color = "#1D9E75";
          btn.textContent = "Resend OTP";
          btn.addEventListener("click", () => {
            const ph = document.getElementById("otp-phone")?.value.trim() ?? "";
            this._otpSendCode(ph);
          }, { once: true });
        }
      }
    }, 1000);
  },

  async _otpSendCode(overridePhone) {
    const phoneEl = document.getElementById("otp-phone");
    const msgEl   = document.getElementById("otp-phone-msg");
    const btn     = document.getElementById("otp-send-btn");
    const phone   = (overridePhone ?? phoneEl?.value.trim() ?? "").replace(/\s/g, "");

    if (msgEl) { msgEl.style.color = "#dc2626"; msgEl.textContent = ""; }
    if (phoneEl) phoneEl.style.border = "1px solid #ddd";

    if (!phone) {
      if (phoneEl) phoneEl.style.border = "1.5px solid #dc2626";
      if (msgEl) msgEl.textContent = "Phone number is required";
      return;
    }
    if (!/^(\+91|0|91)?[6-9]\d{9}$/.test(phone)) {
      if (phoneEl) phoneEl.style.border = "1.5px solid #dc2626";
      if (msgEl) msgEl.textContent = "Enter a valid 10-digit Indian mobile number";
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
    try {
      await authApi.sendOtp(phone);
      // Switch to verify step
      document.getElementById("otp-step-phone").style.display = "none";
      const verifyStep = document.getElementById("otp-step-verify");
      verifyStep.style.display = "flex";
      document.getElementById("otp-phone-display").textContent = phone;
      document.getElementById("otp-code")?.focus();
      this._startResendCountdown();
    } catch (e) {
      if (msgEl) msgEl.textContent = e.message;
      if (btn) { btn.disabled = false; btn.textContent = "Send OTP on WhatsApp"; }
    }
  },

  async _otpVerifyCode() {
    const codeEl  = document.getElementById("otp-code");
    const msgEl   = document.getElementById("otp-verify-msg");
    const btn     = document.getElementById("otp-verify-btn");
    const phone   = document.getElementById("otp-phone-display")?.textContent ?? "";
    const otp     = codeEl?.value.trim() ?? "";

    if (msgEl) { msgEl.style.color = "#dc2626"; msgEl.textContent = ""; }
    if (codeEl) codeEl.style.border = "1px solid #ddd";

    if (!otp || otp.length !== 6) {
      if (codeEl) codeEl.style.border = "1.5px solid #dc2626";
      if (msgEl) msgEl.textContent = "Enter the 6-digit OTP";
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = "Verifying..."; }
    try {
      const remember = document.getElementById("otp-remember")?.checked ?? true;
      await authApi.verifyOtp(phone, otp, remember);
      this.hide();
      window.dispatchEvent(new CustomEvent("dukaanai:login"));
      if (hasLocalData()) this._showMigratePrompt();
    } catch (e) {
      if (msgEl) msgEl.textContent = e.message;
      if (btn) { btn.disabled = false; btn.textContent = "Verify OTP"; }
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
      const { migrated } = await migrateLocalToCloud(msg => { log.textContent = msg; });
      banner.innerHTML = `✓ Migration complete! ${migrated} records uploaded to cloud.<br><small style="opacity:.7">Page will reload in 2s</small>`;
      setTimeout(() => { banner.remove(); window.location.reload(); }, 2000);
    });

    banner.querySelector("#migrate-no").addEventListener("click", () => banner.remove());
  },

  _html(mode) {
    const isLogin = mode === "login";
    return `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:center;justify-content:center">
      <div class="auth-inner" style="background:#fff;border-radius:14px;padding:28px;width:360px;max-width:95vw;font-family:sans-serif">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:22px;font-weight:600;color:#1D9E75">DukaanAI</div>
          <div style="font-size:12px;color:#888;margin-top:2px">Cloud sync for your store</div>
        </div>

        <div style="display:flex;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:18px;overflow:hidden">
          <button id="tab-login"    style="flex:1;padding:8px;border:none;background:${isLogin  ? "#1D9E75" : "#fff"};color:${isLogin  ? "#fff" : "#666"};font-size:12px;font-weight:500;cursor:pointer">Login</button>
          <button id="tab-register" style="flex:1;padding:8px;border:none;background:${!isLogin ? "#1D9E75" : "#fff"};color:${!isLogin ? "#fff" : "#666"};font-size:12px;font-weight:500;cursor:pointer">Register</button>
          <button id="tab-otp"      style="flex:1;padding:8px;border:none;background:#fff;color:#666;font-size:11px;font-weight:500;cursor:pointer">💬 OTP</button>
        </div>

        <div id="auth-form" style="display:flex;flex-direction:column;gap:10px">
          ${!isLogin ? `
          <div>
            <label style="font-size:11px;color:#666;font-weight:500">Store Name *</label>
            <input id="auth-store" placeholder="e.g. Sharma General Stores"
              style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
          </div>` : ""}

          <div>
            <label style="font-size:11px;color:#666;font-weight:500">${isLogin ? "Email or Phone *" : "Email *"}</label>
            <input id="auth-email" type="${isLogin ? "text" : "email"}" placeholder="${isLogin ? "you@example.com or 9876543210" : "you@example.com"}" required
              style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
          </div>

          <div>
            <label style="font-size:11px;color:#666;font-weight:500">Password *</label>
            <input id="auth-password" type="password" placeholder="Min 8 characters" required
              style="width:100%;margin-top:3px;padding:9px 12px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
          </div>

          ${!isLogin ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="font-size:11px;color:#666;font-weight:500">Phone</label>
              <input id="auth-phone" placeholder="9876543210"
                style="width:100%;margin-top:3px;padding:9px 10px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:11px;color:#666;font-weight:500">GSTIN</label>
              <input id="auth-gstin" placeholder="Optional"
                style="width:100%;margin-top:3px;padding:9px 10px;border:1px solid #ddd;border-radius:7px;font-size:13px;box-sizing:border-box">
            </div>
          </div>` : ""}

          ${isLogin ? `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#555;cursor:pointer">
              <input id="auth-remember" type="checkbox" checked style="accent-color:#1D9E75;width:14px;height:14px;cursor:pointer">
              Remember me
            </label>
            <button id="auth-forgot-link"
              style="background:none;border:none;color:#1D9E75;font-size:12px;cursor:pointer;padding:0;text-decoration:underline">
              Forgot password?
            </button>
          </div>` : ""}

          <div id="auth-error" style="color:#dc2626;font-size:12px;min-height:16px"></div>

          <button id="auth-submit"
            style="background:#1D9E75;color:#fff;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;margin-top:2px">
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
