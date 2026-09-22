from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


def build_appt_out(a: models.Appointment) -> schemas.AppointmentOut:
    return schemas.AppointmentOut(
        id=a.id,
        doctor_id=a.doctor_id,
        patient_id=a.patient_id,
        appointment_date=a.appointment_date,
        appointment_time=a.appointment_time,
        reason=a.reason,
        notes=a.notes,
        token_no=a.token_no,
        status=a.status,
        is_notified=a.is_notified,
        created_at=a.created_at,
        doctor_name=a.doctor.name if a.doctor else None,
        patient_name=a.patient.name if a.patient else None,
        doctor_specialization=a.doctor.specialization if a.doctor else None,
    )


@router.get("", response_model=List[schemas.AppointmentOut])
def list_appointments(
    doctor_id: Optional[int] = Query(None),
    patient_id: Optional[int] = Query(None),
    appt_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.Appointment)
    if doctor_id:
        query = query.filter(models.Appointment.doctor_id == doctor_id)
    if patient_id:
        query = query.filter(models.Appointment.patient_id == patient_id)
    if appt_date:
        query = query.filter(models.Appointment.appointment_date == appt_date)
    if status:
        query = query.filter(models.Appointment.status == status)
    if start_date:
        query = query.filter(models.Appointment.appointment_date >= start_date)
    if end_date:
        query = query.filter(models.Appointment.appointment_date <= end_date)

    appts = query.order_by(
        models.Appointment.appointment_date,
        models.Appointment.appointment_time,
    ).all()
    return [build_appt_out(a) for a in appts]


@router.post("", response_model=schemas.AppointmentOut)
def create_appointment(appt: schemas.AppointmentCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    doctor = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    patient = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Auto-assign token number for that doctor on that date
    max_token = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == appt.doctor_id,
        models.Appointment.appointment_date == appt.appointment_date,
    ).count()

    appt_data = appt.model_dump()
    appt_data["token_no"] = max_token + 1

    db_appt = models.Appointment(**appt_data)
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return build_appt_out(db_appt)


@router.get("/today", response_model=List[schemas.AppointmentOut])
def today_appointments(
    doctor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.Appointment).filter(
        models.Appointment.appointment_date == date.today()
    )
    if doctor_id:
        query = query.filter(models.Appointment.doctor_id == doctor_id)
    appts = query.order_by(models.Appointment.appointment_time).all()
    return [build_appt_out(a) for a in appts]


@router.get("/{appt_id}", response_model=schemas.AppointmentOut)
def get_appointment(appt_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return build_appt_out(a)


@router.put("/{appt_id}", response_model=schemas.AppointmentOut)
def update_appointment(appt_id: int, update: schemas.AppointmentUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for key, val in update.model_dump(exclude_none=True).items():
        setattr(a, key, val)
    db.commit()
    db.refresh(a)
    return build_appt_out(a)


@router.delete("/{appt_id}")
def cancel_appointment(appt_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    a.status = models.AppointmentStatus.cancelled
    db.commit()
    return {"message": "Appointment cancelled"}


@router.put("/{appt_id}/notify")
def mark_notified(appt_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Appointment not found")
    a.is_notified = True
    db.commit()
    return {"message": "Marked as notified"}
