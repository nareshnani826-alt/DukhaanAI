// ─────────────────────────────────────────────────────────
// api/auth.js  —  Auth routes
// ─────────────────────────────────────────────────────────
import { api } from "./client.js";

export const authApi = {

  async register({ email, password, store_name, gstin, phone }) {
    const data = await api.post("/auth/register", {
      email, password, store_name, gstin, phone,
    });
    api.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem("dukaanai_vendor", JSON.stringify({
      id: data.vendor_id,
      store_name: data.store_name,
      plan: data.plan,
    }));
    return data;
  },

  async login({ email, password }) {
    const data = await api.post("/auth/login", { email, password });
    api.setTokens(data.access_token, data.refresh_token);
    localStorage.setItem("dukaanai_vendor", JSON.stringify({
      id: data.vendor_id,
      store_name: data.store_name,
      plan: data.plan,
    }));
    return data;
  },

  async logout() {
    const refreshToken = api.getRefreshToken();
    if (refreshToken) {
      await api.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
    }
    api.clearTokens();
  },

  async getProfile() {
    return api.get("/auth/me");
  },

  async updateProfile(updates) {
    return api.patch("/auth/me", updates);
  },
};
