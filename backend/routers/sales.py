from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List
from datetime import date, datetime
from database import get_db
from auth import get_current_user
import models, schemas

router = APIRouter(prefix="/api/sales", tags=["sales"])


def generate_bill_no(db: Session) -> str:
    today = datetime.now().strftime("%Y%m%d")
    count = db.query(func.count(models.Bill.id)).filter(
        func.date(models.Bill.created_at) == date.today()
    ).scalar() or 0
    return f"BILL{today}{str(count + 1).zfill(4)}"


@router.post("", response_model=schemas.BillOut)
def create_bill(bill_data: schemas.BillCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not bill_data.items:
        raise HTTPException(status_code=400, detail="Bill must have at least one item")

    subtotal = 0.0
    cgst_total = 0.0
    sgst_total = 0.0
    bill_items_to_add = []

    for item in bill_data.items:
        medicine = db.query(models.Medicine).filter(models.Medicine.id == item.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine id {item.medicine_id} not found")

        # Find batch with enough stock (FEFO - First Expiry First Out)
        batch = None
        if item.batch_id:
            batch = db.query(models.StockBatch).filter(
                models.StockBatch.id == item.batch_id,
                models.StockBatch.qty_available >= item.qty_sold,
            ).first()
            if not batch:
                raise HTTPException(status_code=400, detail=f"Insufficient stock in selected batch for {medicine.name}")
        else:
            batch = db.query(models.StockBatch).filter(
                models.StockBatch.medicine_id == item.medicine_id,
                models.StockBatch.qty_available >= item.qty_sold,
                models.StockBatch.is_active == True,
            ).order_by(models.StockBatch.expiry_date).first()
            if not batch:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {medicine.name}")

        line_total = item.qty_sold * item.selling_price_per_unit
        gst_amount = line_total * item.gst_percent / 100
        cgst_total += gst_amount / 2
        sgst_total += gst_amount / 2
        subtotal += line_total

        bill_items_to_add.append((item, batch, line_total))

    discount_amount = round(subtotal * bill_data.discount_percent / 100, 2)
    total = round(subtotal - discount_amount + cgst_total + sgst_total, 2)
    change = round(bill_data.amount_paid - total, 2)

    db_bill = models.Bill(
        bill_no=generate_bill_no(db),
        patient_name=bill_data.patient_name,
        patient_phone=bill_data.patient_phone,
        patient_id=bill_data.patient_id,
        payment_method=bill_data.payment_method,
        subtotal=round(subtotal, 2),
        discount_percent=bill_data.discount_percent,
        discount_amount=discount_amount,
        cgst_amount=round(cgst_total, 2),
        sgst_amount=round(sgst_total, 2),
        total_amount=total,
        amount_paid=bill_data.amount_paid,
        change_amount=change,
        notes=bill_data.notes,
        created_by=user.id,
    )
    db.add(db_bill)
    db.flush()

    for item, batch, line_total in bill_items_to_add:
        db_item = models.BillItem(
            bill_id=db_bill.id,
            medicine_id=item.medicine_id,
            batch_id=batch.id,
            qty_sold=item.qty_sold,
            selling_price_per_unit=item.selling_price_per_unit,
            gst_percent=item.gst_percent,
            line_total=line_total,
        )
        db.add(db_item)
        # Deduct stock
        batch.qty_available -= item.qty_sold

    db.commit()
    db.refresh(db_bill)

    if db_bill.patient_phone:
        try:
            store_name_row = db.query(models.StoreSetting).filter(models.StoreSetting.key == "store_name").first()
            s_name = store_name_row.value if store_name_row else "Pharmacy"
            msg = f"{s_name}: Bill #{db_bill.bill_no} of Rs.{db_bill.total_amount:.2f} generated successfully via {db_bill.payment_method}. Thank you for visiting!"
            from sms_service import trigger_auto_sms
            trigger_auto_sms(db, db_bill.patient_phone, msg, event_type="bill")
        except Exception:
            pass

    return _build_bill_out(db_bill)


def _build_bill_out(bill: models.Bill) -> schemas.BillOut:
    items_out = []
    for it in bill.items:
        items_out.append(schemas.BillItemOut(
            id=it.id,
            medicine_id=it.medicine_id,
            batch_id=it.batch_id,
            qty_sold=it.qty_sold,
            selling_price_per_unit=it.selling_price_per_unit,
            gst_percent=it.gst_percent,
            line_total=it.line_total,
            medicine_name=it.medicine.name if it.medicine else None,
            batch_no=it.batch.batch_no if it.batch else None,
        ))
    b_name = None
    if getattr(bill, "biller", None):
        b_name = bill.biller.full_name or bill.biller.username
    return schemas.BillOut(
        id=bill.id,
        bill_no=bill.bill_no,
        patient_name=bill.patient_name,
        patient_phone=bill.patient_phone,
        payment_method=bill.payment_method,
        subtotal=bill.subtotal,
        discount_percent=bill.discount_percent,
        discount_amount=bill.discount_amount,
        cgst_amount=bill.cgst_amount,
        sgst_amount=bill.sgst_amount,
        total_amount=bill.total_amount,
        amount_paid=bill.amount_paid,
        change_amount=bill.change_amount,
        notes=bill.notes,
        created_by=bill.created_by,
        biller_name=b_name,
        created_at=bill.created_at,
        items=items_out,
    )


@router.get("", response_model=List[schemas.BillOut])
def list_bills(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    patient_name: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(models.Bill)
    if start_date:
        query = query.filter(func.date(models.Bill.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(models.Bill.created_at) <= end_date)
    if patient_name:
        query = query.filter(models.Bill.patient_name.ilike(f"%{patient_name}%"))

    bills = query.order_by(models.Bill.created_at.desc()).offset(offset).limit(limit).all()
    return [_build_bill_out(b) for b in bills]


@router.get("/{bill_id}", response_model=schemas.BillOut)
def get_bill(bill_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return _build_bill_out(bill)


@router.get("/stats/daily")
def daily_sales_stats(
    days: int = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    from sqlalchemy import text
    results = db.execute(
        text("""
            SELECT date(created_at) as sale_date,
                   COUNT(*) as bill_count,
                   SUM(total_amount) as revenue
            FROM bills
            WHERE date(created_at) >= date('now', :days_ago)
            GROUP BY date(created_at)
            ORDER BY sale_date
        """),
        {"days_ago": f"-{days} days"},
    ).fetchall()
    return [{"date": str(r[0]), "bill_count": r[1], "revenue": r[2] or 0} for r in results]
