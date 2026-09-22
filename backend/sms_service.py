import urllib.request
import urllib.parse
import json
import logging
from sqlalchemy.orm import Session
import models

logger = logging.getLogger("medify_sms")


def clean_indian_phone(phone: str) -> str:
    """Normalize phone number to 10-digit Indian mobile number."""
    if not phone:
        return ""
    digits = "".join(filter(str.isdigit, str(phone)))
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) > 10 and digits.startswith("0"):
        digits = digits[1:]
    return digits if len(digits) == 10 else ""


def send_fast2sms(api_key: str, phone: str, message: str) -> dict:
    """
    Sends an SMS via Fast2SMS Quick SMS API (https://www.fast2sms.com).
    Fast2SMS is free to register and provides instant API keys in India.
    """
    clean_phone = clean_indian_phone(phone)
    if not clean_phone:
        return {"return": False, "message": "Invalid 10-digit Indian phone number"}

    if not api_key:
        return {"return": False, "message": "Fast2SMS API key not configured"}

    url = "https://www.fast2sms.com/dev/bulkV2"
    params = {
        "authorization": api_key.strip(),
        "route": "q",
        "message": message,
        "language": "english",
        "flash": 0,
        "numbers": clean_phone,
    }

    try:
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "cache-control": "no-cache",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Medify-Pharmacy/2.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            logger.info(f"Fast2SMS response for {clean_phone}: {res_json}")
            return res_json
    except Exception as e:
        logger.error(f"Fast2SMS dispatch failed: {e}")
        return {"return": False, "message": str(e)}


def trigger_auto_sms(db: Session, phone: str, message: str, event_type: str = "bill") -> dict:
    """
    Checks if automatic SMS is enabled in store_settings and dispatches SMS if configured.
    """
    if not phone:
        return {"sent": False, "reason": "No phone number provided"}

    # Fetch settings
    keys = ["fast2sms_api_key", f"auto_sms_{event_type}", "auto_sms_enabled"]
    rows = db.query(models.StoreSetting).filter(models.StoreSetting.key.in_(keys)).all()
    cfg = {r.key: r.value for r in rows}

    api_key = cfg.get("fast2sms_api_key", "").strip()
    is_auto = cfg.get("auto_sms_enabled", "false").lower() == "true"
    event_enabled = cfg.get(f"auto_sms_{event_type}", "true").lower() == "true"

    if not api_key:
        return {"sent": False, "reason": "No Fast2SMS API key configured in Settings"}

    if not is_auto or not event_enabled:
        return {"sent": False, "reason": f"Automatic SMS for {event_type} is disabled in Settings"}

    res = send_fast2sms(api_key, phone, message)
    return {"sent": res.get("return", False), "response": res}
