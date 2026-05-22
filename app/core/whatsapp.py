"""
WhatsApp OTP service via Meta Business API.

Setup checklist (one-time):
1. Create a Meta App at developers.facebook.com → My Apps → Create App → Business
2. Add WhatsApp product → API Setup
3. Copy "Phone Number ID" and generate a System User permanent token
4. Create a message template:
   - Category: AUTHENTICATION
   - Name: otp_authentication  (must match WHATSAPP_OTP_TEMPLATE in .env)
   - Body: "{{1}} is your DukaanAI OTP. Valid for 10 minutes. Do not share."
   - Add a "Copy Code" button (optional but recommended)
5. Wait for template approval (~minutes for AUTHENTICATION category)
6. Set in .env:
     WHATSAPP_ACCESS_TOKEN=your_token
     WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
"""

import httpx
from app.core.config import settings

_GRAPH_URL = "https://graph.facebook.com/v25.0"


def _normalize_phone(phone: str) -> str:
    """Convert any Indian phone format to 91XXXXXXXXXX."""
    p = phone.strip().replace(" ", "").replace("-", "")
    p = p.lstrip("+")
    if p.startswith("0"):
        p = p[1:]
    if not p.startswith("91") and len(p) == 10:
        p = "91" + p
    return p


async def send_otp(phone: str, otp: str) -> bool:
    """
    Send OTP via WhatsApp.
    - Uses plain text message for test numbers (sandbox mode).
    - Switches to approved template once WHATSAPP_OTP_TEMPLATE is set and business is verified.
    Returns True on success, False if WhatsApp is not configured.
    Raises httpx.HTTPStatusError on API failure.
    """
    if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
        return False

    to = _normalize_phone(phone)
    url = f"{_GRAPH_URL}/{settings.whatsapp_phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }

    # Use approved template if configured, otherwise fall back to plain text
    # (plain text works for test numbers added in Meta API Setup page)
    if settings.whatsapp_otp_template:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": settings.whatsapp_otp_template,
                "language": {"code": "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": otp}],
                    }
                ],
            },
        }
    else:
        # Plain text fallback for sandbox/test numbers
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "body": (
                    f"*DukaanAI Verification*\n\n"
                    f"Your OTP is: *{otp}*\n\n"
                    f"Valid for 10 minutes. Do not share this code."
                )
            },
        }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

    return True
