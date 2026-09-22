import os
import shutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from database import engine, Base, SessionLocal
import models

# Import all routers
from routers import auth, medicines, stock, sales, doctors, patients, appointments, dashboard, reports, settings


# ─── Uploads directory ────────────────────────────────────────────────────────
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (no auto-seed — first-run wizard handles setup)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Medify API",
    description="Pharmacy Management Platform by Medify",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    return {"status": "ok", "service": "Medify API", "version": "2.0.0"}


# ─── Serve uploaded files (logos, etc.) ──────────────────────────────────────
if os.path.exists(UPLOADS_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ─── Serve frontend static files (combined deployment) ───────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
