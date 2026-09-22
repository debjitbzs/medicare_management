from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
import io, csv
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/sales-csv")
def sales_csv(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    bills = db.execute(
        text("""
            SELECT b.bill_no, b.patient_name, b.patient_phone, b.payment_method,
                   b.subtotal, b.discount_amount, b.cgst_amount, b.sgst_amount,
                   b.total_amount, b.amount_paid, datetime(b.created_at)
            FROM bills b
            WHERE date(b.created_at) BETWEEN :start AND :end
            ORDER BY b.created_at
        """),
        {"start": str(start_date), "end": str(end_date)},
    ).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Bill No", "Patient", "Phone", "Payment Method",
        "Subtotal", "Discount", "CGST", "SGST",
        "Total", "Amount Paid", "Date",
    ])
    for row in bills:
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sales_{start_date}_{end_date}.csv"},
    )


@router.get("/stock-csv")
def stock_csv(db: Session = Depends(get_db), user=Depends(get_current_user)):
    batches = db.execute(
        text("""
            SELECT m.name, m.category, m.unit, m.rack_location,
                   sb.batch_no, sb.expiry_date, sb.qty_available,
                   sb.purchase_price_per_unit, sb.selling_price_per_unit,
                   s.name as supplier
            FROM stock_batches sb
            JOIN medicines m ON sb.medicine_id = m.id
            LEFT JOIN suppliers s ON sb.supplier_id = s.id
            WHERE sb.is_active = 1 AND sb.qty_available > 0
            ORDER BY m.name, sb.expiry_date
        """)
    ).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Medicine", "Category", "Unit", "Rack",
        "Batch No", "Expiry Date", "Stock Available",
        "Purchase Price/Unit", "Selling Price/Unit", "Supplier",
    ])
    for row in batches:
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=stock_report.csv"},
    )


@router.get("/expiry-csv")
def expiry_csv(days: int = Query(90), db: Session = Depends(get_db), user=Depends(get_current_user)):
    today = date.today()
    batches = db.execute(
        text("""
            SELECT m.name, sb.batch_no, sb.expiry_date,
                   julianday(sb.expiry_date) - julianday('now') as days_left,
                   sb.qty_available, sb.selling_price_per_unit
            FROM stock_batches sb
            JOIN medicines m ON sb.medicine_id = m.id
            WHERE sb.is_active = 1
              AND date(sb.expiry_date) <= date('now', :cutoff)
              AND sb.qty_available > 0
            ORDER BY sb.expiry_date
        """),
        {"cutoff": f"+{days} days"},
    ).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Medicine", "Batch No", "Expiry Date", "Days Left", "Qty Available", "Selling Price/Unit"])
    for row in batches:
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expiry_report.csv"},
    )
