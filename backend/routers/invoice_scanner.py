"""
invoice_scanner.py — AI-powered bill/invoice scanner using Gemini
"""
import os
import base64
import json
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/api/invoice", tags=["invoice"])

# ─── Built-in Gemini API key (single-shop deployment) ────────────────────────
# Key is loaded from environment variable — never hardcoded in source.
# Set GEMINI_API_KEY in your .env file locally, or in Render dashboard.
_DEFAULT_GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")


def _call_gemini(image_b64: str, mime_type: str, api_key: str) -> list:
    """Call Gemini Vision API to parse the invoice image."""
    import urllib.request
    import urllib.error

    prompt = """You are an expert at reading Indian pharmaceutical invoices/bills.

Analyze this medicine supply invoice image and extract ALL line items.
For each medicine, extract:
- name: Full medicine name exactly as written (e.g. "Calpol 500mg Tab")
- generic_name: Generic/salt name if visible (e.g. "Paracetamol")
- manufacturer: Company/manufacturer name (e.g. "GSK", "Cipla")
- batch_no: Batch number (usually labeled as "Batch" or "B.No")
- hsn_code: HSN code if present (6-8 digit number)
- expiry_date: Expiry date in YYYY-MM-DD format (convert from formats like "06/27" → "2027-06-30", "Jan-2027" → "2027-01-31")
- qty: Quantity/units purchased (integer)
- unit: Pack type (Strip, Bottle, Vial, Tube, Sachet, Box)
- purchase_price_total: Total purchase cost for this line (the "Amount" or "Net Amount" column)
- selling_price_per_unit: MRP per unit if shown, otherwise estimate as purchase_price_total/qty * 1.15
- category: One of: Tablet, Capsule, Syrup, Injection, Drops, Ointment, Powder, Inhaler, Other
- gst_percent: GST % if visible (0, 5, 12, or 18), default 12

Return ONLY a valid JSON array. No markdown, no explanation:
[
  {
    "name": "...",
    "generic_name": "...",
    "manufacturer": "...",
    "batch_no": "...",
    "hsn_code": "...",
    "expiry_date": "YYYY-MM-DD",
    "qty": 100,
    "unit": "Strip",
    "purchase_price_total": 1500.00,
    "selling_price_per_unit": 22.00,
    "category": "Tablet",
    "gst_percent": 12
  }
]

Important rules:
- Include ALL items on the invoice, don't skip any
- If a field is not visible, use empty string "" or 0
- qty must be a positive integer
- purchase_price_total must be the TOTAL amount for that line (not per unit)
- Return ONLY the JSON array, nothing else
"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": image_b64
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
        }
    }

    # AQ. prefix = new OAuth2 project key → use Bearer token in header
    # AIza prefix = classic API key → use ?key= query param
    def _build_request(model: str, body: bytes) -> urllib.request.Request:
        if api_key.startswith("AQ."):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            }
        else:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
        return urllib.request.Request(url, data=body, headers=headers)

    data = json.dumps(payload).encode("utf-8")
    primary_model = "gemini-2.5-flash"
    req = _build_request(primary_model, data)

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        # Fallback cascade: try alternative models on 404 or 503
        if e.code in (404, 503):
            fallback_models = ["gemini-2.0-flash", "gemini-1.5-flash-latest"]
            result = None
            last_err = f"Gemini API error ({e.code}): {err_body[:300]}"
            for fb_model in fallback_models:
                fb_req = _build_request(fb_model, data)
                try:
                    with urllib.request.urlopen(fb_req, timeout=60) as fb_resp:
                        result = json.loads(fb_resp.read().decode("utf-8"))
                    break  # success — stop trying
                except urllib.error.HTTPError as fb_e:
                    last_err = f"Gemini API error ({fb_e.code}): {fb_e.read().decode('utf-8')[:200]}"
                except Exception as fb_ex:
                    last_err = str(fb_ex)
            if result is None:
                raise HTTPException(status_code=503, detail=f"All Gemini models unavailable. Last error: {last_err}")
        else:
            raise HTTPException(status_code=400, detail=f"Gemini API error ({e.code}): {err_body[:300]}")

    # Extract text from response
    try:
        text = result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=500, detail="Unexpected Gemini response format")

    # Parse JSON — strip any markdown fences if present
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    text = text.strip()

    try:
        items = json.loads(text)
        if not isinstance(items, list):
            raise ValueError("Not a list")
        return items
    except (json.JSONDecodeError, ValueError) as e:
        # Try to find JSON array in the text
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Could not parse AI response as JSON: {text[:200]}")


@router.post("/scan")
async def scan_invoice(
    image: UploadFile = File(...),
    gemini_api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Scan a supplier invoice image using Gemini AI.
    Returns a list of parsed medicine items ready for review.
    """
    # Resolve API key: request → DB → env/hardcoded default
    api_key = gemini_api_key
    if not api_key:
        row = db.query(models.StoreSetting).filter_by(key="gemini_api_key").first()
        api_key = (row.value or "").strip() if row else ""
    if not api_key:
        api_key = _DEFAULT_GEMINI_KEY

    # Validate image
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file (JPEG, PNG, etc.)")

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(status_code=400, detail="Image too large. Max 20MB.")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = image.content_type

    # Call Gemini
    items = _call_gemini(image_b64, mime_type, api_key)

    # Enrich each item with existing medicine info (for smart matching)
    medicines = db.query(models.Medicine).filter(models.Medicine.is_active == True).all()
    med_names = {m.name.lower(): m for m in medicines}

    result = []
    for item in items:
        name = item.get("name", "").strip()
        # Try fuzzy match against existing medicines
        existing_id = None
        existing_name = None
        for med_name_lower, med in med_names.items():
            # Simple contains match
            if name.lower() in med_name_lower or med_name_lower in name.lower():
                existing_id = med.id
                existing_name = med.name
                break

        result.append({
            "name":                  name,
            "generic_name":          item.get("generic_name", ""),
            "manufacturer":          item.get("manufacturer", ""),
            "batch_no":              item.get("batch_no", ""),
            "hsn_code":              item.get("hsn_code", ""),
            "expiry_date":           item.get("expiry_date", ""),
            "qty":                   int(item.get("qty", 0) or 0),
            "unit":                  item.get("unit", "Strip"),
            "purchase_price_total":  float(item.get("purchase_price_total", 0) or 0),
            "selling_price_per_unit": float(item.get("selling_price_per_unit", 0) or 0),
            "category":              item.get("category", "Tablet"),
            "gst_percent":           float(item.get("gst_percent", 12) or 12),
            "existing_medicine_id":  existing_id,
            "existing_medicine_name": existing_name,
            "is_new_medicine":       existing_id is None,
        })

    return {"items": result, "count": len(result)}


@router.post("/import")
async def import_invoice_items(
    items: List[dict],
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Import a list of scanned/reviewed invoice items into the database.
    - If medicine already exists → just adds a new stock batch
    - If new medicine → creates medicine + stock batch
    """
    cat_map = {
        "Tablet": models.MedicineCategory.tablet,
        "Capsule": models.MedicineCategory.capsule,
        "Syrup": models.MedicineCategory.syrup,
        "Injection": models.MedicineCategory.injection,
        "Drops": models.MedicineCategory.drops,
        "Ointment": models.MedicineCategory.ointment,
        "Powder": models.MedicineCategory.powder,
        "Inhaler": models.MedicineCategory.inhaler,
    }

    import datetime

    results = []
    for item in items:
        medicine_id = item.get("existing_medicine_id")
        action = "stock_added"

        # Create new medicine if needed
        if not medicine_id:
            med = models.Medicine(
                name=item["name"],
                generic_name=item.get("generic_name") or None,
                category=cat_map.get(item.get("category", "Tablet"), models.MedicineCategory.tablet),
                manufacturer=item.get("manufacturer") or None,
                hsn_code=item.get("hsn_code") or None,
                unit=item.get("unit", "Strip"),
                gst_percent=float(item.get("gst_percent", 12)),
                min_stock_alert=10,
                is_active=True,
            )
            db.add(med)
            db.flush()
            medicine_id = med.id
            action = "medicine_and_stock_added"

        # Parse expiry date
        expiry_date = None
        raw_expiry = item.get("expiry_date", "")
        if raw_expiry:
            try:
                expiry_date = datetime.date.fromisoformat(raw_expiry)
            except ValueError:
                # Try other formats
                for fmt in ("%m/%Y", "%d/%m/%Y", "%b-%Y", "%B %Y"):
                    try:
                        dt = datetime.datetime.strptime(raw_expiry, fmt)
                        # Set to end of month
                        import calendar
                        last_day = calendar.monthrange(dt.year, dt.month)[1]
                        expiry_date = dt.date().replace(day=last_day)
                        break
                    except ValueError:
                        continue

        if not expiry_date:
            # Default: 2 years from now
            expiry_date = datetime.date.today().replace(year=datetime.date.today().year + 2)

        qty = int(item.get("qty", 0) or 0)
        purchase_total = float(item.get("purchase_price_total", 0) or 0)
        sell_price = float(item.get("selling_price_per_unit", 0) or 0)

        if qty <= 0:
            results.append({"name": item.get("name"), "action": "skipped", "reason": "qty is 0"})
            continue

        if sell_price <= 0 and purchase_total > 0:
            sell_price = round((purchase_total / qty) * 1.15, 2)

        batch = models.StockBatch(
            medicine_id=medicine_id,
            batch_no=item.get("batch_no") or f"SCAN-{datetime.date.today().strftime('%Y%m%d')}",
            expiry_date=expiry_date,
            qty_purchased=qty,
            qty_available=qty,
            purchase_price_total=purchase_total,
            purchase_price_per_unit=round(purchase_total / qty, 4) if qty > 0 else 0,
            selling_price_per_unit=sell_price,
            purchase_date=datetime.date.today(),
            is_active=True,
        )
        db.add(batch)
        results.append({"name": item.get("name"), "action": action, "medicine_id": medicine_id})

    db.commit()
    new_count = sum(1 for r in results if r["action"] == "medicine_and_stock_added")
    stock_count = sum(1 for r in results if r["action"] == "stock_added")
    skip_count = sum(1 for r in results if r["action"] == "skipped")

    return {
        "success": True,
        "total": len(results),
        "new_medicines": new_count,
        "stock_updated": stock_count,
        "skipped": skip_count,
        "results": results,
    }
