from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date, timedelta
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/stock", tags=["stock"])


@router.post("/batches", response_model=schemas.StockBatchOut)
def add_stock_batch(batch: schemas.StockBatchCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    medicine = db.query(models.Medicine).filter(models.Medicine.id == batch.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")

    purchase_price_per_unit = round(batch.purchase_price_total / batch.qty_purchased, 4) if batch.qty_purchased > 0 else 0

    db_batch = models.StockBatch(
        **batch.model_dump(),
        qty_available=batch.qty_purchased,
        purchase_price_per_unit=purchase_price_per_unit,
    )
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)

    out = schemas.StockBatchOut.model_validate(db_batch)
    out.medicine_name = medicine.name
    return out


@router.get("/batches", response_model=List[schemas.StockBatchOut])
def list_batches(
    medicine_id: Optional[int] = Query(None),
    expiring_days: Optional[int] = Query(None),
    low_qty: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.StockBatch).filter(models.StockBatch.is_active == True)
    if medicine_id:
        query = query.filter(models.StockBatch.medicine_id == medicine_id)
    if expiring_days is not None:
        cutoff = date.today() + timedelta(days=expiring_days)
        query = query.filter(models.StockBatch.expiry_date <= cutoff)
    if low_qty:
        query = query.filter(models.StockBatch.qty_available <= 0)
    batches = query.order_by(models.StockBatch.expiry_date).all()
    result = []
    for b in batches:
        out = schemas.StockBatchOut.model_validate(b)
        out.medicine_name = b.medicine.name if b.medicine else None
        out.supplier_name = b.supplier.name if b.supplier else None
        result.append(out)
    return result


@router.get("/batches/{batch_id}", response_model=schemas.StockBatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    b = db.query(models.StockBatch).filter(models.StockBatch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    out = schemas.StockBatchOut.model_validate(b)
    out.medicine_name = b.medicine.name if b.medicine else None
    out.supplier_name = b.supplier.name if b.supplier else None
    return out


@router.put("/batches/{batch_id}/adjust")
def adjust_stock(
    batch_id: int,
    qty_change: int = Query(..., description="Positive to add, negative to deduct"),
    reason: str = Query("Manual adjustment"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    b = db.query(models.StockBatch).filter(models.StockBatch.id == batch_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    new_qty = b.qty_available + qty_change
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Cannot reduce stock below 0")
    b.qty_available = new_qty
    db.commit()
    return {"message": f"Stock adjusted to {new_qty}", "qty_available": new_qty}


# ─── Suppliers ────────────────────────────────────────────────────────────────
@router.get("/suppliers", response_model=List[schemas.SupplierOut])
def list_suppliers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Supplier).filter(models.Supplier.is_active == True).all()


@router.post("/suppliers", response_model=schemas.SupplierOut)
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    db_sup = models.Supplier(**supplier.model_dump())
    db.add(db_sup)
    db.commit()
    db.refresh(db_sup)
    return db_sup


@router.get("/expiry-report")
def expiry_report(days: int = Query(90, description="Alert for medicines expiring within N days"), db: Session = Depends(get_db), user=Depends(get_current_user)):
    cutoff = date.today() + timedelta(days=days)
    today = date.today()
    batches = db.query(models.StockBatch).filter(
        models.StockBatch.is_active == True,
        models.StockBatch.expiry_date <= cutoff,
        models.StockBatch.qty_available > 0,
    ).order_by(models.StockBatch.expiry_date).all()
    result = []
    for b in batches:
        days_left = (b.expiry_date - today).days
        result.append({
            "batch_id": b.id,
            "medicine_id": b.medicine_id,
            "medicine_name": b.medicine.name if b.medicine else "",
            "batch_no": b.batch_no,
            "expiry_date": str(b.expiry_date),
            "days_left": days_left,
            "qty_available": b.qty_available,
            "status": "expired" if days_left < 0 else ("critical" if days_left <= 30 else "warning"),
        })
    return result
