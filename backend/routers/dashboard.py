from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, timedelta
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_stats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)

    # Today's sales
    today_result = db.execute(
        text("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM bills WHERE date(created_at) = :today"),
        {"today": str(today)},
    ).fetchone()
    today_bills = today_result[0] or 0
    today_sales = today_result[1] or 0.0

    # Today's appointments
    today_appts = db.query(func.count(models.Appointment.id)).filter(
        models.Appointment.appointment_date == today
    ).scalar() or 0

    # Low stock
    low_stock_count = 0
    medicines = db.query(models.Medicine).filter(models.Medicine.is_active == True).all()
    for m in medicines:
        total = db.query(func.sum(models.StockBatch.qty_available)).filter(
            models.StockBatch.medicine_id == m.id,
            models.StockBatch.is_active == True,
        ).scalar() or 0
        if total <= m.min_stock_alert:
            low_stock_count += 1

    # Expiry soon (within 90 days)
    expiry_cutoff = today + timedelta(days=90)
    expiry_soon = db.query(func.count(models.StockBatch.id)).filter(
        models.StockBatch.is_active == True,
        models.StockBatch.expiry_date <= expiry_cutoff,
        models.StockBatch.qty_available > 0,
    ).scalar() or 0

    total_medicines = db.query(func.count(models.Medicine.id)).filter(models.Medicine.is_active == True).scalar() or 0
    total_patients = db.query(func.count(models.Patient.id)).filter(models.Patient.is_active == True).scalar() or 0

    monthly_result = db.execute(
        text("SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE date(created_at) >= :month_start"),
        {"month_start": str(month_start)},
    ).fetchone()
    monthly_revenue = monthly_result[0] or 0.0

    return schemas.DashboardStats(
        today_sales=today_sales,
        today_bills=today_bills,
        today_appointments=today_appts,
        low_stock_count=low_stock_count,
        expiry_soon_count=expiry_soon,
        total_medicines=total_medicines,
        total_patients=total_patients,
        monthly_revenue=monthly_revenue,
    )


@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    today = date.today()
    notifications = []

    # Today's appointments (snooze alerts)
    appts = db.query(models.Appointment).filter(
        models.Appointment.appointment_date == today,
        models.Appointment.status == models.AppointmentStatus.scheduled,
    ).order_by(models.Appointment.appointment_time).all()

    for a in appts:
        notifications.append({
            "id": a.id,
            "type": "appointment",
            "title": f"Appointment at {a.appointment_time}",
            "message": f"Dr. {a.doctor.name if a.doctor else 'Unknown'} — Patient: {a.patient.name if a.patient else 'Unknown'} (Token #{a.token_no})",
            "data": {
                "appointment_id": a.id,
                "doctor_id": a.doctor_id,
                "patient_id": a.patient_id,
                "time": a.appointment_time,
            },
            "is_notified": a.is_notified,
        })

    # Low stock alerts
    medicines = db.query(models.Medicine).filter(models.Medicine.is_active == True).all()
    for m in medicines:
        total = db.query(func.sum(models.StockBatch.qty_available)).filter(
            models.StockBatch.medicine_id == m.id,
            models.StockBatch.is_active == True,
        ).scalar() or 0
        if total <= m.min_stock_alert:
            notifications.append({
                "id": m.id,
                "type": "low_stock",
                "title": "Low Stock Alert",
                "message": f"{m.name} — Only {total} {m.unit}(s) remaining (Min: {m.min_stock_alert})",
                "data": {"medicine_id": m.id, "qty": total},
                "is_notified": False,
            })

    # Expiry alerts (within 30 days)
    cutoff = today + timedelta(days=30)
    expiring = db.query(models.StockBatch).filter(
        models.StockBatch.is_active == True,
        models.StockBatch.expiry_date <= cutoff,
        models.StockBatch.qty_available > 0,
    ).order_by(models.StockBatch.expiry_date).all()

    for b in expiring:
        days_left = (b.expiry_date - today).days
        status = "EXPIRED" if days_left < 0 else f"{days_left} days left"
        notifications.append({
            "id": b.id,
            "type": "expiry",
            "title": "Expiry Alert",
            "message": f"{b.medicine.name if b.medicine else ''} (Batch: {b.batch_no}) — {status}",
            "data": {"batch_id": b.id, "medicine_id": b.medicine_id, "days_left": days_left},
            "is_notified": False,
        })

    return notifications


@router.get("/top-medicines")
def top_medicines(days: int = 30, limit: int = 10, db: Session = Depends(get_db), user=Depends(get_current_user)):
    results = db.execute(
        text("""
            SELECT m.name, SUM(bi.qty_sold) as total_qty, SUM(bi.line_total) as total_revenue
            FROM bill_items bi
            JOIN medicines m ON bi.medicine_id = m.id
            JOIN bills b ON bi.bill_id = b.id
            WHERE date(b.created_at) >= date('now', :days_ago)
            GROUP BY bi.medicine_id, m.name
            ORDER BY total_qty DESC
            LIMIT :limit
        """),
        {"days_ago": f"-{days} days", "limit": limit},
    ).fetchall()
    return [{"name": r[0], "qty": r[1], "revenue": r[2]} for r in results]
