import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
from auth import get_password_hash
import models

# Import all routers
from routers import auth, medicines, stock, sales, doctors, patients, appointments, dashboard, reports, settings


def seed_initial_data():
    """Create default admin user and sample store settings if DB is fresh."""
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            db.add(models.User(
                username="admin",
                full_name="Administrator",
                email="admin@medicare.local",
                password_hash=get_password_hash("admin123"),
                role=models.UserRole.admin,
            ))
            db.add(models.User(
                username="pharmacist",
                full_name="Pharmacy Staff",
                email="staff@medicare.local",
                password_hash=get_password_hash("pharma123"),
                role=models.UserRole.pharmacist,
            ))
        # Default store settings
        defaults = {
            "store_name": "MediCare Pharmacy",
            "currency_symbol": "₹",
            "low_stock_days": "90",
            "expiry_alert_days": "90",
        }
        for key, val in defaults.items():
            existing = db.query(models.StoreSetting).filter(models.StoreSetting.key == key).first()
            if not existing:
                db.add(models.StoreSetting(key=key, value=val))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield


app = FastAPI(
    title="MediCare Pro API",
    description="Pharmacy Management System API",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # In production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Routers ──────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(medicines.router)
app.include_router(stock.router)
app.include_router(sales.router)
app.include_router(doctors.router)
app.include_router(patients.router)
app.include_router(appointments.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(settings.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "MediCare Pro API"}


# ─── Serve frontend static files (for combined deployment) ──────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
