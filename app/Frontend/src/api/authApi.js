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

  async login({ identifier, password, remember = true }) {
    const data = await api.post("/auth/login", { identifier, password });
    api.setTokens(data.access_token, data.refresh_token, remember);
    localStorage.setItem("dukaanai_vendor", JSON.stringify({
      id: data.vendor_id,
      store_name: data.store_name,
      plan: data.plan,
    }));
    return data;
  },

  async sendOtp(phone) {
    return api.post("/auth/send-otp", { phone });
  },

  async verifyOtp(phone, otp, remember = true) {
    const data = await api.post("/auth/verify-otp", { phone, otp });
    api.setTokens(data.access_token, data.refresh_token, remember);
    localStorage.setItem("dukaanai_vendor", JSON.stringify({
      id: data.vendor_id,
      store_name: data.store_name,
      plan: data.plan,
    }));
    return data;
  },

  async forgotPassword(email) {
    return api.post("/auth/forgot-password", { email });
  },

  async resetPassword(token, newPassword) {
    return api.post("/auth/reset-password", { token, new_password: newPassword });
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
