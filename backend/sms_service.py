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
    Fast2SMS provides instant free registration in India.
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


def send_android_gateway(gateway_url: str, phone: str, message: str) -> dict:
    """
    Sends an SMS through the shop's Android phone using a free local Android SMS Gateway app.
    Uses the shop SIM card's free daily SMS pack!
    """
    clean_phone = clean_indian_phone(phone)
    if not clean_phone:
        return {"return": False, "message": "Invalid 10-digit Indian phone number"}

    url = gateway_url.strip().rstrip("/")
    if not url.startswith("http"):
        url = "http://" + url

    target_url = url if ("/message" in url or "/send" in url) else f"{url}/message"

    payload = json.dumps({
        "phoneNumbers": [clean_phone],
        "phone": clean_phone,
        "to": clean_phone,
        "message": message,
        "text": message,
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            target_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Medify-Pharmacy/2.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=6) as response:
            res_data = response.read().decode("utf-8")
            logger.info(f"Android SMS Gateway response: {res_data}")
            return {"return": True, "message": "SMS dispatched via Shop Android SIM Gateway", "raw": res_data}
    except Exception as e:
        logger.error(f"Android SMS Gateway dispatch failed: {e}")
        return {"return": False, "message": f"Gateway error: {e}"}


def trigger_auto_sms(db: Session, phone: str, message: str, event_type: str = "bill", force: bool = False) -> dict:
    """
    Checks if automatic SMS is enabled in store_settings and dispatches SMS if configured.
    If force is True, attempts dispatch immediately regardless of auto_sms_enabled flag.
    """
    if not phone:
        return {"sent": False, "message": "No phone number provided"}

    # Fetch settings
    keys = [
        "sms_provider",
        "android_gateway_url",
        "fast2sms_api_key",
        f"auto_sms_{event_type}",
        "auto_sms_enabled",
    ]
    rows = db.query(models.StoreSetting).filter(models.StoreSetting.key.in_(keys)).all()
    cfg = {r.key: r.value for r in rows}

    provider = cfg.get("sms_provider", "fast2sms").lower()
    android_url = cfg.get("android_gateway_url", "").strip()
    api_key = cfg.get("fast2sms_api_key", "").strip()
    is_auto = cfg.get("auto_sms_enabled", "false").lower() == "true"
    event_enabled = cfg.get(f"auto_sms_{event_type}", "true").lower() == "true"

    if not force and (not is_auto or not event_enabled):
        return {"sent": False, "message": f"Automatic SMS for {event_type} is disabled in Settings"}

    if provider == "android" and android_url:
        res = send_android_gateway(android_url, phone, message)
        return {"sent": res.get("return", False), "message": res.get("message", "Sent via Android SIM Gateway"), "response": res}
    elif api_key:
        res = send_fast2sms(api_key, phone, message)
        return {"sent": res.get("return", False), "message": res.get("message", "Sent via Fast2SMS"), "response": res}
    elif android_url:
        res = send_android_gateway(android_url, phone, message)
        return {"sent": res.get("return", False), "message": res.get("message", "Sent via Android SIM Gateway"), "response": res}
    else:
        return {
            "sent": False,
            "message": "No SMS provider configured. Please set your Android Gateway URL or Fast2SMS API Key in Settings → SMS Automation.",
        }
                "return": False,
                "message": (
                    f"Connection timed out at {parsed.netloc or url}. "
                    "Make sure phone and laptop are on the same Wi-Fi network."
                )
            }
        return {"return": False, "message": f"Cannot connect to phone ({reason_str})"}
    except Exception as e:
        logger.error(f"Android SMS Gateway dispatch failed: {e}")
        return {"return": False, "message": f"Gateway error: {e}"}


def trigger_auto_sms(db: Session, phone: str, message: str, event_type: str = "bill", force: bool = False) -> dict:
    """
    Checks if automatic SMS is enabled in store_settings and dispatches SMS if configured.
    If force is True, attempts dispatch immediately regardless of auto_sms_enabled flag.
    """
    if not phone:
        return {"sent": False, "message": "No phone number provided"}

    # Fetch settings
    keys = [
        "sms_provider",
        "android_gateway_url",
        "fast2sms_api_key",
        f"auto_sms_{event_type}",
        "auto_sms_enabled",
    ]
    rows = db.query(models.StoreSetting).filter(models.StoreSetting.key.in_(keys)).all()
    cfg = {r.key: r.value for r in rows}

    provider = cfg.get("sms_provider", "fast2sms").lower()
    android_url = cfg.get("android_gateway_url", "").strip()
    api_key = cfg.get("fast2sms_api_key", "").strip()
    is_auto = cfg.get("auto_sms_enabled", "false").lower() == "true"
    event_enabled = cfg.get(f"auto_sms_{event_type}", "true").lower() == "true"

    if not force and (not is_auto or not event_enabled):
        return {"sent": False, "message": f"Automatic SMS for {event_type} is disabled in Settings"}

    if provider == "android" and android_url:
        res = send_android_gateway(android_url, phone, message)
        return {"sent": res.get("return", False), "message": res.get("message", "Sent via Android SIM Gateway"), "response": res}
    elif api_key:
        res = send_fast2sms(api_key, phone, message)
        return {"sent": res.get("return", False), "message": res.get("message", "Sent via Fast2SMS"), "response": res}
    elif android_url:
        res = send_android_gateway(android_url, phone, message)
        return {"sent": res.get("return", False), "message": res.get("message", "Sent via Android SIM Gateway"), "response": res}
    else:
        return {
            "sent": False,
            "message": "No SMS provider configured. Please set your Android Gateway URL or Fast2SMS API Key in Settings → SMS Automation.",
        }
