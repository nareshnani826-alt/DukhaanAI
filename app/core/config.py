from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "DukaanAI"
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"
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

    # AssemblyAI (speech-to-text for voice assistant & chatbot)
    assemblyai_api_key: str = ""

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
