from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


@router.get("", response_model=List[schemas.DoctorOut])
def list_doctors(
    search: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.Doctor).filter(models.Doctor.is_active == True)
    if search:
        query = query.filter(models.Doctor.name.ilike(f"%{search}%"))
    if specialization:
        query = query.filter(models.Doctor.specialization.ilike(f"%{specialization}%"))
    return query.order_by(models.Doctor.name).all()


@router.post("", response_model=schemas.DoctorOut)
def create_doctor(doctor: schemas.DoctorCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_doc = models.Doctor(**doctor.model_dump())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc


@router.get("/{doctor_id}", response_model=schemas.DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


@router.put("/{doctor_id}", response_model=schemas.DoctorOut)
def update_doctor(doctor_id: int, doctor: schemas.DoctorCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for key, val in doctor.model_dump().items():
        setattr(doc, key, val)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doctor_id}")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    doc = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc.is_active = False
    db.commit()
    return {"message": "Doctor deactivated"}
