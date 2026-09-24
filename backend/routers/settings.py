import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, get_password_hash
import models

router = APIRouter(prefix="/api/settings", tags=["settings"])

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
LOGO_PATH = os.path.join(UPLOADS_DIR, "logo.png")

DEFAULT_SETTINGS = {
    "store_name": "",
    "store_address": "",
    "store_phone": "",
    "store_email": "",
    "store_gst": "",
    "store_license": "",
    "currency_symbol": "₹",
    "low_stock_days": "90",
    "expiry_alert_days": "90",
    "store_language": "en",
    "store_logo": "",
    "auto_sms_enabled": "false",
    "fast2sms_api_key": "",
    "auto_sms_bill": "true",
    "auto_sms_appointment": "true",
    "gemini_api_key": "",         # For AI Invoice Scanner
}



@router.get("")
def get_settings(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(models.StoreSetting).all()
    settings = {r.key: r.value for r in rows}
    for k, v in DEFAULT_SETTINGS.items():
        if k not in settings:
            settings[k] = v
    # Check if logo file exists
    settings["has_logo"] = os.path.exists(LOGO_PATH)
    return settings


@router.put("")
def update_settings(settings: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    for key, value in settings.items():
        if key in ("has_logo",):
            continue  # skip read-only computed fields
        row = db.query(models.StoreSetting).filter(models.StoreSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(models.StoreSetting(key=key, value=str(value)))
    db.commit()
    return {"message": "Settings updated"}


@router.post("/logo")
def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(get_current_user)):
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    # Accept jpg/jpeg/png/gif/webp
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        raise HTTPException(status_code=400, detail="Only image files are allowed (png, jpg, jpeg, gif, webp)")
    dest = os.path.join(UPLOADS_DIR, f"logo.{ext}")
    # Remove old logos
    for old_ext in ("png", "jpg", "jpeg", "gif", "webp"):
        old = os.path.join(UPLOADS_DIR, f"logo.{old_ext}")
        if os.path.exists(old):
            os.remove(old)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    # Store path in settings
    row = db.query(models.StoreSetting).filter(models.StoreSetting.key == "store_logo").first()
    logo_url = f"/uploads/logo.{ext}"
    if row:
        row.value = logo_url
    else:
        db.add(models.StoreSetting(key="store_logo", value=logo_url))
    db.commit()
    return {"message": "Logo uploaded", "url": logo_url}


@router.delete("/logo")
def delete_logo(db: Session = Depends(get_db), user=Depends(get_current_user)):
    for ext in ("png", "jpg", "jpeg", "gif", "webp"):
        p = os.path.join(UPLOADS_DIR, f"logo.{ext}")
        if os.path.exists(p):
            os.remove(p)
    row = db.query(models.StoreSetting).filter(models.StoreSetting.key == "store_logo").first()
    if row:
        row.value = ""
    db.commit()
    return {"message": "Logo removed"}


@router.post("/test-sms")
def test_sms(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    phone = payload.get("phone", "")
    provider = payload.get("provider", "fast2sms").lower()
    api_key = payload.get("api_key", "").strip()
    android_url = payload.get("android_url", "").strip()

    from sms_service import send_fast2sms, send_android_gateway
    if provider == "android":
        if not android_url:
            row = db.query(models.StoreSetting).filter(models.StoreSetting.key == "android_gateway_url").first()
            android_url = row.value if row else ""
        if not android_url:
            raise HTTPException(status_code=400, detail="Please enter your Android Gateway URL (e.g. http://192.168.1.15:8080).")
        return send_android_gateway(android_url, phone, "Medify Test: Automated SMS via Shop Android SIM Gateway is working!")
    else:
        if not api_key:
            row = db.query(models.StoreSetting).filter(models.StoreSetting.key == "fast2sms_api_key").first()
            api_key = row.value if row else ""
        if not api_key:
            raise HTTPException(status_code=400, detail="Please enter a Fast2SMS API key first.")
        return send_fast2sms(api_key, phone, "Medify Test: Automated SMS is working properly! Thank you.")

