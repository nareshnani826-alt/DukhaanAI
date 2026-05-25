from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "DukaanAI"
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"
    # Comma-separated extra origins (e.g. "https://dukhaanai.onrender.com,https://app.dukhaanai.com")
    allowed_origins: str = ""
    admin_secret_key: str = "change-me"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # Groq AI — primary LLM (free tier: 30 RPM, 14,400 req/day — Llama 3.3 70B)
    groq_api_key: str = ""

    # Google Gemini — fallback LLM when Groq hits rate limit
    # Free tier: ~1,500 req/day (Gemini 1.5 Flash). Get key at aistudio.google.com
    gemini_api_key: str = ""

    # Bing Image Search (auto-fetch product images from the web)
    # Get key: portal.azure.com → Create resource → Bing Search v7 → Keys
    bing_search_key: str = ""

    # AssemblyAI (speech-to-text for voice assistant & chatbot)
    assemblyai_api_key: str = ""

    # WhatsApp Business API (Meta) — for OTP login
    # Setup: developers.facebook.com → My Apps → WhatsApp → API Setup
    whatsapp_access_token: str = ""      # System user permanent token
    whatsapp_phone_number_id: str = ""   # From API Setup page
    whatsapp_otp_template: str = "otp_authentication"  # Your approved template name

    # Email / SMTP (for password reset emails)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "noreply@dukhaanai.com"

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpay_pro_monthly_plan_id: str = ""
    razorpay_pro_yearly_plan_id: str = ""
    razorpay_wholesale_monthly_plan_id: str = ""
    razorpay_wholesale_yearly_plan_id: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"   # silently skip VITE_* and other frontend-only keys


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

# Plan pricing (in paise — Razorpay uses smallest currency unit)
PLAN_PRICING = {
    "pro": {
        "monthly": {"amount": 29900, "label": "₹299/month"},
        "yearly":  {"amount": 239000, "label": "₹2,390/year"},
    },
    "wholesale": {
        "monthly": {"amount": 99900, "label": "₹999/month"},
        "yearly":  {"amount": 799000, "label": "₹7,990/year"},
    },
}
