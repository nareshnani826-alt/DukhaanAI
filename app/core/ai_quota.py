"""
Per-shop daily cap on paid/free-tier LLM calls (Groq / Gemini).

All shops share one API key, so without a cap one busy shop can use up the
whole day's free allowance for everyone. Keyword answers that never reach an
LLM are not counted.
"""
import logging

from fastapi import HTTPException

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)


def use_ai_quota(vendor_id: str) -> None:
    """Count one AI call for this shop today; raise 429 once over the daily limit."""
    try:
        used = get_db().rpc("bump_ai_usage", {"p_vendor_id": vendor_id}).execute().data
    except Exception as e:
        # Counter unavailable (e.g. scripts/add_ai_usage.sql not run yet) — don't block the shop
        logger.warning("AI usage counter failed for %s: %s", vendor_id, e)
        return
    if isinstance(used, int) and used > settings.ai_daily_limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Today's AI limit is used up ({settings.ai_daily_limit} questions). It resets at midnight. "
                "Quick questions like \"today's profit\" or \"low stock\" still work."
            ),
        )
