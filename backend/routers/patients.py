from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("", response_model=List[schemas.PatientOut])
def list_patients(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.Patient).filter(models.Patient.is_active == True)
    if search:
        query = query.filter(
            models.Patient.name.ilike(f"%{search}%") |
            models.Patient.phone.ilike(f"%{search}%")
        )
    return query.order_by(models.Patient.name).all()


@router.post("", response_model=schemas.PatientOut)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_pat = models.Patient(**patient.model_dump())
    db.add(db_pat)
    db.commit()
    db.refresh(db_pat)
    return db_pat


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pat = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
    return pat


@router.put("/{patient_id}", response_model=schemas.PatientOut)
def update_patient(patient_id: int, patient: schemas.PatientCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pat = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
    for key, val in patient.model_dump().items():
        setattr(pat, key, val)
    db.commit()
    db.refresh(pat)
    return pat


@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pat = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not pat:
        raise HTTPException(status_code=404, detail="Patient not found")
    pat.is_active = False
    db.commit()
    return {"message": "Patient deactivated"}


@router.get("/{patient_id}/appointments")
def patient_appointments(patient_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    appts = db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id
    ).order_by(models.Appointment.appointment_date.desc()).all()
    result = []
    for a in appts:
        result.append({
            "id": a.id,
            "doctor_name": a.doctor.name if a.doctor else "",
            "doctor_specialization": a.doctor.specialization if a.doctor else "",
            "appointment_date": str(a.appointment_date),
            "appointment_time": a.appointment_time,
            "status": a.status,
            "reason": a.reason,
        })
    return result


@router.get("/{patient_id}/bills")
def patient_bills(patient_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    bills = db.query(models.Bill).filter(models.Bill.patient_id == patient_id).order_by(models.Bill.created_at.desc()).all()
    return [{"id": b.id, "bill_no": b.bill_no, "total_amount": b.total_amount, "created_at": str(b.created_at)} for b in bills]
