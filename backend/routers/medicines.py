from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/medicines", tags=["medicines"])


def get_total_stock(db: Session, medicine_id: int) -> int:
    result = db.query(func.sum(models.StockBatch.qty_available)).filter(
        models.StockBatch.medicine_id == medicine_id,
        models.StockBatch.is_active == True,
    ).scalar()
    return result or 0


@router.get("", response_model=List[schemas.MedicineOut])
def list_medicines(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.Medicine).filter(models.Medicine.is_active == True)
    if search:
        query = query.filter(
            models.Medicine.name.ilike(f"%{search}%") |
            models.Medicine.generic_name.ilike(f"%{search}%")
        )
    if category:
        query = query.filter(models.Medicine.category == category)

    medicines = query.order_by(models.Medicine.name).all()
    result = []
    for m in medicines:
        stock = get_total_stock(db, m.id)
        if low_stock is not None:
            if low_stock and stock > m.min_stock_alert:
                continue
            if not low_stock and stock <= m.min_stock_alert:
                continue
        out = schemas.MedicineOut.model_validate(m)
        out.total_stock = stock
        result.append(out)
    return result


@router.post("", response_model=schemas.MedicineOut)
def create_medicine(medicine: schemas.MedicineCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_med = models.Medicine(**medicine.model_dump())
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    out = schemas.MedicineOut.model_validate(db_med)
    out.total_stock = 0
    return out


@router.get("/{medicine_id}", response_model=schemas.MedicineOut)
def get_medicine(medicine_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
    out = schemas.MedicineOut.model_validate(m)
    out.total_stock = get_total_stock(db, m.id)
    return out


@router.put("/{medicine_id}", response_model=schemas.MedicineOut)
def update_medicine(medicine_id: int, medicine: schemas.MedicineUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
    for key, val in medicine.model_dump().items():
        setattr(m, key, val)
    db.commit()
    db.refresh(m)
    out = schemas.MedicineOut.model_validate(m)
    out.total_stock = get_total_stock(db, m.id)
    return out


@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    m = db.query(models.Medicine).filter(models.Medicine.id == medicine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Medicine not found")
    m.is_active = False
    db.commit()
    return {"message": "Medicine deactivated"}


@router.get("/{medicine_id}/batches", response_model=List[schemas.StockBatchOut])
def get_medicine_batches(medicine_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    batches = db.query(models.StockBatch).filter(
        models.StockBatch.medicine_id == medicine_id,
        models.StockBatch.is_active == True,
    ).order_by(models.StockBatch.expiry_date).all()
    result = []
    for b in batches:
        out = schemas.StockBatchOut.model_validate(b)
        out.medicine_name = b.medicine.name if b.medicine else None
        out.supplier_name = b.supplier.name if b.supplier else None
        result.append(out)
    return result
