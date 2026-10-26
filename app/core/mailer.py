"""
Outgoing email (sign-up OTP, password reset).

Brevo's HTTPS API when BREVO_API_KEY is set — works on Render's free plan,
which blocks outbound SMTP ports. Otherwise plain SMTP (SMTP_HOST etc.).
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import settings

_BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def email_configured() -> bool:
    return bool(settings.brevo_api_key or settings.smtp_host)


def send_email(to_email: str, subject: str, text: str, html: str) -> bool:
    """Send one email. Returns False (and logs why) on any failure."""
    try:
        if settings.brevo_api_key:
            res = httpx.post(
                _BREVO_URL,
                headers={"api-key": settings.brevo_api_key, "accept": "application/json"},
                json={
                    "sender":      {"name": settings.app_name, "email": settings.smtp_from},
                    "to":          [{"email": to_email}],
                    "subject":     subject,
                    "textContent": text,
                    "htmlContent": html,
                },
                timeout=20,
            )
            if res.status_code >= 300:
                logging.error("Brevo email to %s failed: %s %s", to_email, res.status_code, res.text[:300])
                return False
            return True

        if settings.smtp_host:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = settings.smtp_from
            msg["To"]      = to_email
            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_pass)
                s.sendmail(settings.smtp_from, to_email, msg.as_string())
            return True

        logging.error("Email to %s not sent: neither BREVO_API_KEY nor SMTP_HOST is set", to_email)
        return False
    except Exception as e:
        logging.error("Email to %s failed: %s: %s", to_email, type(e).__name__, e)
        return False
