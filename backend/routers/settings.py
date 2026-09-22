from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "store_name": "MediCare Pharmacy",
    "store_address": "",
    "store_phone": "",
    "store_email": "",
    "store_gst": "",
    "store_license": "",
    "currency_symbol": "₹",
    "low_stock_days": "90",
    "expiry_alert_days": "90",
}


@router.get("")
def get_settings(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(models.StoreSetting).all()
    settings = {r.key: r.value for r in rows}
    # Fill defaults for missing keys
    for k, v in DEFAULT_SETTINGS.items():
        if k not in settings:
            settings[k] = v
    return settings


@router.put("")
def update_settings(settings: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    for key, value in settings.items():
        row = db.query(models.StoreSetting).filter(models.StoreSetting.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(models.StoreSetting(key=key, value=str(value)))
    db.commit()
    return {"message": "Settings updated"}
