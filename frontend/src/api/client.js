// ─────────────────────────────────────────────────────────
// api/client.js  —  Base HTTP client for DukaanAI backend
// ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  // ── Token management ──────────────────────────────────

  getAccessToken() {
    return localStorage.getItem("dukaanai_access_token");
  }

  getRefreshToken() {
    return localStorage.getItem("dukaanai_refresh_token");
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem("dukaanai_access_token", accessToken);
    localStorage.setItem("dukaanai_refresh_token", refreshToken);
  }

  clearTokens() {
    localStorage.removeItem("dukaanai_access_token");
    localStorage.removeItem("dukaanai_refresh_token");
    localStorage.removeItem("dukaanai_vendor");
  }

  isLoggedIn() {
    return !!this.getAccessToken();
  }

  getVendor() {
    const v = localStorage.getItem("dukaanai_vendor");
    return v ? JSON.parse(v) : null;
  }

  getPlan() {
    const vendor = this.getVendor();
    return vendor?.plan || "free";
  }

  isProPlan() {
    return ["pro", "wholesale"].includes(this.getPlan());
  }

  // ── Core request ──────────────────────────────────────

  async request(method, path, body = null, retry = true) {
    const headers = { "Content-Type": "application/json" };
    const token = this.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${path}`, options);

    // Token expired — try refresh once
    if (res.status === 401 && retry) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) return this.request(method, path, body, false);
      this.clearTokens();
      window.dispatchEvent(new CustomEvent("dukaanai:logout"));
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) return null;
    return res.json();
  }

  get(path)              { return this.request("GET",    path); }
  post(path, body)       { return this.request("POST",   path, body); }
  patch(path, body)      { return this.request("PATCH",  path, body); }
  delete(path)           { return this.request("DELETE", path); }

  // ── Auth token refresh ────────────────────────────────

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const data = await this.request(
        "POST", "/auth/refresh", { refresh_token: refreshToken }, false
      );
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
