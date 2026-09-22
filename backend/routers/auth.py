from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from auth import authenticate_user, create_access_token, get_password_hash, get_current_user, require_admin
import models, schemas
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── Schema for first-run setup ──────────────────────────────────────────────
class SetupRequest(BaseModel):
    store_name: str
    store_phone: str
    store_email: Optional[str] = ""
    store_language: Optional[str] = "en"
    admin_full_name: str
    admin_username: str
    admin_password: str


# ─── Public: Check if first-run setup is needed ───────────────────────────────
@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    """Returns whether the DB has any users yet (first-run detection)."""
    count = db.query(models.User).count()
    return {"is_first_run": count == 0}


# ─── Public: First-run setup wizard ──────────────────────────────────────────
@router.post("/setup")
def setup_store(payload: SetupRequest, db: Session = Depends(get_db)):
    """Creates the first admin user + store settings. Only works when no users exist."""
    count = db.query(models.User).count()
    if count > 0:
        raise HTTPException(status_code=400, detail="Store already set up. Please log in.")

    # Create admin user
    admin_user = models.User(
        username=payload.admin_username,
        full_name=payload.admin_full_name,
        email=payload.store_email or None,
        password_hash=get_password_hash(payload.admin_password),
        role=models.UserRole.admin,
    )
    db.add(admin_user)

    # Store settings
    store_defaults = {
        "store_name": payload.store_name,
        "store_phone": payload.store_phone,
        "store_email": payload.store_email or "",
        "store_language": payload.store_language or "en",
        "currency_symbol": "₹",
        "low_stock_days": "90",
        "expiry_alert_days": "90",
    }
    for key, val in store_defaults.items():
        row = db.query(models.StoreSetting).filter(models.StoreSetting.key == key).first()
        if row:
            row.value = val
        else:
            db.add(models.StoreSetting(key=key, value=val))

    db.commit()
    db.refresh(admin_user)

    # Auto-login: return token
    token = create_access_token({"sub": admin_user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": admin_user.id,
            "username": admin_user.username,
            "full_name": admin_user.full_name,
            "role": admin_user.role,
            "email": admin_user.email,
        },
    }


# ─── Login ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "email": user.email,
        },
    }


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/users", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    db_user = models.User(
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        password_hash=get_password_hash(user.password),
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.User).all()


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(u)
    db.commit()
    return {"message": "User deleted"}
