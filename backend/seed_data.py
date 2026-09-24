"""
seed_data.py — Comprehensive demo data seeder for Medify / Sinha Medicare
Run from the backend directory:
    python seed_data.py

NOTE: This script is ADDITIVE — it won't delete existing data.
      If a user/store already exists it skips that step.
"""

import os, sys, random, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
import models
from auth import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()

TODAY = datetime.date.today()

print("═" * 60)
print("  Medify — Sinha Medicare Demo Data Seeder")
print("═" * 60)

# ─────────────────────────────────────────────────────────────
# 1. STORE SETTINGS
# ─────────────────────────────────────────────────────────────
print("\n[1/7] Setting up store information...")

store_settings = {
    "store_name":        "Sinha Medicare",
    "store_phone":       "7003126139",
    "store_email":       "debjitbzs@gmail.com",
    "store_address":     "14, Panchanantala Road, Sodepur, Kolkata - 700110",
    "store_gst":         "19AABCS1234A1Z5",
    "store_license":     "WB-KOL-2024-00812",
    "store_language":    "en",
    "currency_symbol":   "₹",
    "low_stock_days":    "90",
    "expiry_alert_days": "90",
}

for key, value in store_settings.items():
    row = db.query(models.StoreSetting).filter_by(key=key).first()
    if row:
        row.value = value
    else:
        db.add(models.StoreSetting(key=key, value=value))
db.commit()
print("   ✅ Store settings saved")

# ─────────────────────────────────────────────────────────────
# 2. ADMIN USER
# ─────────────────────────────────────────────────────────────
print("\n[2/7] Creating admin user...")

existing_admin = db.query(models.User).filter_by(username="subhajit").first()
if existing_admin:
    print("   ⚠️  Admin 'subhajit' already exists, skipping")
    admin = existing_admin
else:
    admin = models.User(
        username="subhajit",
        full_name="Subhajit Sinha",
        email="debjitbzs@gmail.com",
        password_hash=get_password_hash("sinha@123"),
        role=models.UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("   ✅ Admin created — Username: subhajit | Password: sinha@123")

# Staff user
staff_existing = db.query(models.User).filter_by(username="debjit").first()
if not staff_existing:
    staff = models.User(
        username="debjit",
        full_name="Debjit Sinha",
        email="debjit@sinhamedicare.in",
        password_hash=get_password_hash("debjit@123"),
        role=models.UserRole.pharmacist,
        is_active=True,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    print("   ✅ Staff created — Username: debjit | Password: debjit@123")

# ─────────────────────────────────────────────────────────────
# 3. SUPPLIER
# ─────────────────────────────────────────────────────────────
print("\n[3/7] Creating supplier...")
supplier_existing = db.query(models.Supplier).filter_by(name="Bengal Pharma Distributors").first()
if supplier_existing:
    supplier = supplier_existing
else:
    supplier = models.Supplier(
        name="Bengal Pharma Distributors",
        contact_person="Amitabh Roy",
        phone="9831056789",
        email="bengalpharma@gmail.com",
        address="16, Strand Road, Kolkata - 700001",
        gst_no="19AACFB1234B1ZD",
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    print("   ✅ Supplier created")

# ─────────────────────────────────────────────────────────────
# 4. MEDICINES (100 real Indian medicines)
# ─────────────────────────────────────────────────────────────
print("\n[4/7] Adding 100 medicines with real prices...")

medicines_data = [
    # ── TABLETS ──────────────────────────────────────────────
    ("Calpol 500mg", "Paracetamol", "Tablet", "GSK", "Strip", 18.50, 22.00),
    ("Dolo 650mg", "Paracetamol 650mg", "Tablet", "Micro Labs", "Strip", 26.00, 31.00),
    ("Combiflam", "Ibuprofen + Paracetamol", "Tablet", "Sanofi", "Strip", 29.50, 35.00),
    ("Voveran 50mg", "Diclofenac Sodium", "Tablet", "Novartis", "Strip", 34.00, 40.00),
    ("Meftal Spas", "Mefenamic Acid + Dicyclomine", "Tablet", "Blue Cross", "Strip", 38.00, 45.00),
    ("Metformin 500mg", "Metformin HCl", "Tablet", "USV", "Strip", 24.00, 30.00),
    ("Glucophage 500mg", "Metformin", "Tablet", "Merck", "Strip", 38.00, 45.00),
    ("Glycomet GP2", "Glimepiride + Metformin", "Tablet", "USV", "Strip", 72.00, 85.00),
    ("Amaryl 2mg", "Glimepiride", "Tablet", "Sanofi", "Strip", 65.00, 78.00),
    ("Atorvastatin 10mg", "Atorvastatin", "Tablet", "Sun Pharma", "Strip", 48.00, 58.00),
    ("Lipitor 20mg", "Atorvastatin", "Tablet", "Pfizer", "Strip", 98.00, 118.00),
    ("Rosuvas 10mg", "Rosuvastatin", "Tablet", "Sun Pharma", "Strip", 84.00, 100.00),
    ("Ecosprin 75mg", "Aspirin", "Tablet", "USV", "Strip", 12.50, 15.00),
    ("Ecosprin 150mg", "Aspirin 150mg", "Tablet", "USV", "Strip", 18.00, 22.00),
    ("Telma 40mg", "Telmisartan", "Tablet", "Glenmark", "Strip", 88.00, 105.00),
    ("Amlodipine 5mg", "Amlodipine Besylate", "Tablet", "Cipla", "Strip", 32.00, 38.00),
    ("Stamlo 5mg", "Amlodipine", "Tablet", "Dr Reddy's", "Strip", 45.00, 54.00),
    ("Atenolol 50mg", "Atenolol", "Tablet", "Alkem", "Strip", 22.00, 26.00),
    ("Metoprolol 50mg", "Metoprolol", "Tablet", "Sun Pharma", "Strip", 38.00, 45.00),
    ("Lasix 40mg", "Furosemide", "Tablet", "Sanofi", "Strip", 16.00, 20.00),
    ("Pantoprazole 40mg", "Pantoprazole", "Tablet", "Sun Pharma", "Strip", 42.00, 50.00),
    ("Pan 40mg", "Pantoprazole", "Tablet", "Alkem", "Strip", 35.00, 42.00),
    ("Omez 20mg", "Omeprazole", "Tablet", "Dr Reddy's", "Strip", 28.00, 34.00),
    ("Rablet 20mg", "Rabeprazole", "Tablet", "Lupin", "Strip", 55.00, 66.00),
    ("Cetirizine 10mg", "Cetirizine HCl", "Tablet", "Cipla", "Strip", 14.00, 18.00),
    ("Montair LC", "Montelukast + Levocetirizine", "Tablet", "Cipla", "Strip", 98.00, 118.00),
    ("Levocet M", "Levocetirizine + Montelukast", "Tablet", "USV", "Strip", 88.00, 105.00),
    ("Allegra 120mg", "Fexofenadine", "Tablet", "Sanofi", "Strip", 115.00, 138.00),
    ("Azithromycin 500mg", "Azithromycin", "Tablet", "Cipla", "Strip", 68.00, 82.00),
    ("Azithral 500mg", "Azithromycin", "Tablet", "Alembic", "Strip", 72.00, 86.00),
    ("Amoxicillin 500mg", "Amoxicillin", "Capsule", "GSK", "Strip", 45.00, 54.00),
    ("Augmentin 625mg", "Amoxicillin+Clavulanic Acid", "Tablet", "GSK", "Strip", 185.00, 220.00),
    ("Ciprofloxacin 500mg", "Ciprofloxacin", "Tablet", "Cipla", "Strip", 38.00, 46.00),
    ("Norflox TZ", "Norfloxacin + Tinidazole", "Tablet", "Alkem", "Strip", 52.00, 62.00),
    ("Ofloxacin 200mg", "Ofloxacin", "Tablet", "Cipla", "Strip", 42.00, 50.00),
    ("Doxycycline 100mg", "Doxycycline", "Capsule", "Lupin", "Strip", 35.00, 42.00),
    ("Metronidazole 400mg", "Metronidazole", "Tablet", "Flagyl", "Strip", 18.00, 22.00),
    ("Fluconazole 150mg", "Fluconazole", "Capsule", "Cipla", "Strip", 62.00, 74.00),
    ("Clotrimazole 200mg", "Clotrimazole", "Tablet", "GSK", "Strip", 38.00, 46.00),
    ("Alprazolam 0.25mg", "Alprazolam", "Tablet", "Sun Pharma", "Strip", 28.00, 34.00),
    ("Clonazepam 0.5mg", "Clonazepam", "Tablet", "Sun Pharma", "Strip", 35.00, 42.00),
    ("Sertraline 50mg", "Sertraline HCl", "Tablet", "Lupin", "Strip", 85.00, 102.00),
    ("Escitalopram 10mg", "Escitalopram Oxalate", "Tablet", "Sun Pharma", "Strip", 78.00, 94.00),
    ("Risperidone 2mg", "Risperidone", "Tablet", "Janssen", "Strip", 88.00, 106.00),
    ("Thyronorm 50mcg", "Levothyroxine", "Tablet", "Abbott", "Strip", 32.00, 38.00),
    ("Eltroxin 50mcg", "Levothyroxine", "Tablet", "GSK", "Strip", 28.00, 34.00),
    ("Calcium Sandoz 500mg", "Calcium Carbonate + Vit D3", "Tablet", "Sandoz", "Strip", 45.00, 54.00),
    ("Shelcal 500mg", "Calcium + Vitamin D3", "Tablet", "Elder", "Strip", 52.00, 62.00),
    ("Becosules Capsules", "B-Complex + Vitamin C", "Capsule", "Pfizer", "Strip", 72.00, 86.00),
    ("Revital H", "Multivitamin + Minerals", "Capsule", "Ranbaxy", "Strip", 148.00, 178.00),
    # ── CAPSULES ─────────────────────────────────────────────
    ("Omez Capsule 20mg", "Omeprazole", "Capsule", "Dr Reddy's", "Strip", 30.00, 36.00),
    ("Pacitane 2mg", "Trihexyphenidyl", "Tablet", "Pfizer", "Strip", 22.00, 26.00),
    ("Pregabalin 75mg", "Pregabalin", "Capsule", "Sun Pharma", "Strip", 82.00, 98.00),
    ("Gabapin NT 100", "Gabapentin + NT", "Capsule", "Intas", "Strip", 95.00, 114.00),
    ("Duloxetine 30mg", "Duloxetine HCl", "Capsule", "Lupin", "Strip", 112.00, 134.00),
    ("Pantocid D", "Pantoprazole + Domperidone", "Capsule", "Sun Pharma", "Strip", 58.00, 70.00),
    ("Ranitidine 150mg", "Ranitidine", "Tablet", "Cipla", "Strip", 22.00, 26.00),
    ("Aceclofenac 100mg", "Aceclofenac", "Tablet", "Aristo", "Strip", 38.00, 46.00),
    ("Zerodol SP", "Aceclofenac + Serratiopeptidase", "Tablet", "Ipca", "Strip", 75.00, 90.00),
    ("Diclofenac Gel", "Diclofenac Sodium", "Ointment", "Novartis", "Tube", 62.00, 75.00),
    ("Volini Gel", "Diclofenac + Methyl Salicylate", "Ointment", "Sun Pharma", "Tube", 88.00, 105.00),
    ("Betadine Ointment", "Povidone Iodine", "Ointment", "Win Medicare", "Tube", 52.00, 62.00),
    ("Soframycin Cream", "Framycetin", "Ointment", "Sanofi", "Tube", 48.00, 58.00),
    ("Candid B Cream", "Clotrimazole + Beclomethasone", "Ointment", "Glenmark", "Tube", 65.00, 78.00),
    ("Terbinafine 1%", "Terbinafine HCl", "Ointment", "Novartis", "Tube", 78.00, 94.00),
    ("Clobetasol Cream", "Clobetasol Propionate", "Ointment", "Cipla", "Tube", 42.00, 50.00),
    ("Hydrocortisone 1%", "Hydrocortisone", "Ointment", "Sun Pharma", "Tube", 35.00, 42.00),
    ("Methylcobalamin 500mcg", "Methylcobalamin", "Tablet", "Sun Pharma", "Strip", 65.00, 78.00),
    ("Neurobion Forte", "Vitamin B-Complex", "Tablet", "Merck", "Strip", 38.00, 46.00),
    ("Folic Acid 5mg", "Folic Acid", "Tablet", "Abbott", "Strip", 15.00, 18.00),
    ("Iron Sucrose 100mg", "Ferric Carboxymaltose", "Tablet", "Emcure", "Strip", 42.00, 50.00),
    # ── SYRUPS ───────────────────────────────────────────────
    ("Calpol Syrup 120ml", "Paracetamol Suspension", "Syrup", "GSK", "Bottle", 42.00, 52.00),
    ("Ibugesic Syrup", "Ibuprofen Suspension", "Syrup", "Cipla", "Bottle", 48.00, 58.00),
    ("Cetrizine Syrup", "Cetirizine HCl", "Syrup", "Sun Pharma", "Bottle", 38.00, 46.00),
    ("Benadryl Cough Syrup", "Diphenhydramine + Ammonium Chloride", "Syrup", "J&J", "Bottle", 52.00, 62.00),
    ("Ascoril LS Syrup", "Levosalbutamol + Ambroxol", "Syrup", "Glenmark", "Bottle", 88.00, 105.00),
    ("Honitus Syrup", "Tulsi + Ginger Extract", "Syrup", "Dabur", "Bottle", 52.00, 62.00),
    ("Alex Syrup", "Chlorpheniramine + Phenylpropanolamine", "Syrup", "Glenmark", "Bottle", 45.00, 54.00),
    ("Phensedyl Cough", "Codeine + Chlorpheniramine", "Syrup", "Abbott", "Bottle", 58.00, 70.00),
    ("Ventorlin Syrup", "Salbutamol", "Syrup", "GSK", "Bottle", 35.00, 42.00),
    ("Asthalin Syrup", "Salbutamol", "Syrup", "Cipla", "Bottle", 32.00, 38.00),
    ("Digene Syrup", "Aluminium Hydroxide + Magnesium", "Syrup", "Abbott", "Bottle", 58.00, 70.00),
    ("Gelusil Syrup", "Aluminium Hydroxide + Mag Hydroxide", "Syrup", "Pfizer", "Bottle", 52.00, 62.00),
    ("Cremaffin Syrup", "Liquid Paraffin + Milk of Magnesia", "Syrup", "Abbott", "Bottle", 72.00, 86.00),
    ("Duphalac Syrup", "Lactulose", "Syrup", "Abbott", "Bottle", 148.00, 178.00),
    ("Electral Powder", "ORS Electrolytes", "Syrup", "FDC", "Sachet", 8.00, 10.00),
    ("Pedialyte 200ml", "ORS for Children", "Syrup", "Abbott", "Bottle", 88.00, 105.00),
    ("Ambroxol Syrup", "Ambroxol HCl", "Syrup", "Cipla", "Bottle", 42.00, 50.00),
    ("Bromhexine Syrup", "Bromhexine HCl", "Syrup", "German Remedies", "Bottle", 38.00, 46.00),
    ("Decdan Syrup", "Dexamethasone", "Syrup", "Lupin", "Bottle", 48.00, 58.00),
    ("Zincovit Syrup", "Zinc + Multivitamin", "Syrup", "Apex", "Bottle", 62.00, 74.00),
    ("Livogen Syrup", "Ferrous Fumarate + Folic Acid", "Syrup", "Merck", "Bottle", 68.00, 82.00),
    ("Fer-In-Sol Syrup", "Ferrous Sulphate", "Syrup", "Mead Johnson", "Bottle", 55.00, 66.00),
    ("Calvit Syrup", "Calcium + Vitamin D3", "Syrup", "Sun Pharma", "Bottle", 72.00, 86.00),
    ("Zydone Syrup", "Paracetamol + Caffeine", "Syrup", "Zydus", "Bottle", 38.00, 46.00),
    ("Taxim O Syrup", "Cefixime", "Syrup", "Alkem", "Bottle", 118.00, 142.00),
    ("Oflox Syrup", "Ofloxacin", "Syrup", "Cipla", "Bottle", 68.00, 82.00),
    ("Sporidex Syrup", "Cephalexin", "Syrup", "Ranbaxy", "Bottle", 95.00, 114.00),
    ("Clavam 228.5 Syrup", "Amoxicillin + Clavulanate", "Syrup", "Alkem", "Bottle", 148.00, 178.00),
    ("Betadine Gargle", "Povidone Iodine", "Syrup", "Win Medicare", "Bottle", 45.00, 54.00),
    ("Hexigel Oral", "Chlorhexidine Gluconate", "Syrup", "ICPA", "Bottle", 38.00, 46.00),
]

print(f"   Adding {len(medicines_data)} medicines...")
medicine_objects = []
for i, (name, generic, cat, mfr, unit, buy_price, sell_price) in enumerate(medicines_data):
    existing = db.query(models.Medicine).filter_by(name=name).first()
    if existing:
        medicine_objects.append(existing)
        continue

    cat_map = {
        "Tablet": models.MedicineCategory.tablet,
        "Capsule": models.MedicineCategory.capsule,
        "Syrup": models.MedicineCategory.syrup,
        "Ointment": models.MedicineCategory.ointment,
    }
    med = models.Medicine(
        name=name,
        generic_name=generic,
        category=cat_map.get(cat, models.MedicineCategory.other),
        manufacturer=mfr,
        unit=unit,
        gst_percent=12.0,
        min_stock_alert=10,
        is_active=True,
    )
    db.add(med)
    db.flush()

    # Add stock batch
    expiry = TODAY.replace(year=TODAY.year + 2)
    batch = models.StockBatch(
        medicine_id=med.id,
        supplier_id=supplier.id,
        batch_no=f"BT{i+1:04d}",
        expiry_date=expiry,
        qty_purchased=random.randint(80, 200),
        qty_available=random.randint(40, 150),
        purchase_price_total=round(buy_price * 100, 2),
        purchase_price_per_unit=buy_price,
        selling_price_per_unit=sell_price,
        purchase_date=TODAY - datetime.timedelta(days=random.randint(10, 60)),
        is_active=True,
    )
    db.add(batch)
    medicine_objects.append(med)

db.commit()
print(f"   ✅ {len(medicine_objects)} medicines ready with stock batches")

# Refresh medicine objects to get IDs
refreshed_meds = db.query(models.Medicine).filter(models.Medicine.is_active == True).all()

# ─────────────────────────────────────────────────────────────
# 5. DOCTORS
# ─────────────────────────────────────────────────────────────
print("\n[5/7] Creating doctors...")

doctors_data = [
    ("Riddhiman Ghosh", "General Medicine", "MBBS", "9831011223", "Mon,Tue,Wed,Thu,Fri", "10:00-14:00", 300.0, "Room 1"),
    ("Dibyendu Sinha", "General Physician", "MBBS", "9831022334", "Mon,Wed,Fri", "17:00-21:00", 300.0, "Room 2"),
    ("Priya Sharma", "Gynaecology & Obstetrics", "MBBS, MD (Gynae)", "9830033445", "Tue,Thu,Sat", "10:00-14:00", 500.0, "Room 3"),
    ("Suresh Mondal", "Paediatrics", "MBBS, MD (Paeds)", "9830044556", "Mon,Wed,Fri,Sat", "09:00-13:00", 450.0, "Room 4"),
    ("Ananya Bose", "Dermatology", "MBBS, MD (Derm)", "9831055667", "Tue,Thu", "11:00-15:00", 600.0, "Room 5"),
    ("Rajesh Kumar", "Cardiology", "MBBS, MD, DM (Cardio)", "9830066778", "Mon,Tue,Thu", "09:00-13:00", 800.0, "Room 6"),
    ("Santanu Das", "Orthopaedics", "MBBS, MS (Ortho)", "9831077889", "Wed,Fri,Sat", "10:00-14:00", 500.0, "Room 7"),
    ("Mousumi Chatterjee", "Endocrinology", "MBBS, MD, DM (Endo)", "9830088990", "Mon,Thu", "14:00-18:00", 700.0, "Room 8"),
    ("Subrata Pal", "Neurology", "MBBS, MD, DM (Neuro)", "9831099001", "Tue,Fri", "10:00-14:00", 800.0, "Room 9"),
    ("Rituparna Sen", "Ophthalmology", "MBBS, MS (Ophth)", "9830010112", "Mon,Wed,Sat", "09:00-13:00", 400.0, "Room 10"),
]

doctor_objects = []
for name, spec, qual, phone, days, time, fee, room in doctors_data:
    existing = db.query(models.Doctor).filter_by(name=name).first()
    if existing:
        doctor_objects.append(existing)
        continue
    doc = models.Doctor(
        name=name,
        specialization=spec,
        qualification=qual,
        phone=phone,
        schedule_days=days,
        schedule_time=time,
        consultation_fee=fee,
        room_no=room,
        is_active=True,
    )
    db.add(doc)
    doctor_objects.append(doc)

db.commit()
print(f"   ✅ {len(doctor_objects)} doctors created")

# Refresh to get IDs
doctor_objects = db.query(models.Doctor).filter(models.Doctor.is_active == True).all()

# ─────────────────────────────────────────────────────────────
# 6. PATIENTS
# ─────────────────────────────────────────────────────────────
print("\n[6/7] Creating patients and appointments...")

patients_data = [
    ("Ramesh Sharma",   45, "Male",   "9830100001", "A+"),
    ("Sunita Devi",     38, "Female", "9830100002", "B+"),
    ("Kartik Biswas",   62, "Male",   "9830100003", "O+"),
    ("Priya Roy",       28, "Female", "9830100004", "AB+"),
    ("Suresh Ghosh",    55, "Male",   "9830100005", "A-"),
    ("Meera Banerjee",  42, "Female", "9830100006", "B-"),
    ("Arun Kumar",      70, "Male",   "9830100007", "O-"),
    ("Lalita Singh",    33, "Female", "9830100008", "B+"),
    ("Dipankar Das",    48, "Male",   "9830100009", "A+"),
    ("Anita Chakraborty", 52, "Female", "9830100010", "O+"),
    ("Bikash Mondal",   39, "Male",   "9830100011", "AB-"),
    ("Rupa Sen",        27, "Female", "9830100012", "A+"),
    ("Nikhil Bose",     58, "Male",   "9830100013", "B+"),
    ("Srabanti Pal",    35, "Female", "9830100014", "O+"),
    ("Tapas Saha",      66, "Male",   "9830100015", "A+"),
]

patient_objects = []
for name, age, gender, phone, blood in patients_data:
    existing = db.query(models.Patient).filter_by(phone=phone).first()
    if existing:
        patient_objects.append(existing)
        continue
    gender_map = {"Male": models.Gender.male, "Female": models.Gender.female}
    p = models.Patient(
        name=name,
        age=age,
        gender=gender_map.get(gender, models.Gender.other),
        phone=phone,
        blood_group=blood,
        address="Kolkata, West Bengal",
        is_active=True,
    )
    db.add(p)
    patient_objects.append(p)

db.commit()
patient_objects = db.query(models.Patient).filter(models.Patient.is_active == True).all()
print(f"   ✅ {len(patient_objects)} patients created")

# ─── Appointments ────────────────────────────────────────────
times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00"]
statuses = [models.AppointmentStatus.scheduled, models.AppointmentStatus.completed, models.AppointmentStatus.scheduled]
reasons = ["Fever and cold", "Routine check-up", "Blood pressure monitoring", "Diabetes follow-up",
           "Skin rash", "Joint pain", "Chest discomfort", "Eye irritation", "Child vaccination", "Thyroid check"]

appt_count = 0
for i, patient in enumerate(patient_objects[:12]):
    doc = doctor_objects[i % len(doctor_objects)]
    appt_date = TODAY + datetime.timedelta(days=random.randint(-3, 5))
    existing_appt = db.query(models.Appointment).filter_by(
        patient_id=patient.id, doctor_id=doc.id, appointment_date=appt_date
    ).first()
    if existing_appt:
        continue

    # Count existing tokens for this doctor+date
    token = db.query(models.Appointment).filter_by(
        doctor_id=doc.id, appointment_date=appt_date
    ).count() + 1

    appt = models.Appointment(
        doctor_id=doc.id,
        patient_id=patient.id,
        appointment_date=appt_date,
        appointment_time=times[i % len(times)],
        status=statuses[i % len(statuses)],
        reason=reasons[i % len(reasons)],
        token_no=token,
        is_notified=False,
    )
    db.add(appt)
    appt_count += 1

db.commit()
print(f"   ✅ {appt_count} appointments booked")

# ─────────────────────────────────────────────────────────────
# 7. SALES / BILLS
# ─────────────────────────────────────────────────────────────
print("\n[7/7] Creating sample sales bills...")

bill_count = 0
med_with_stock = (
    db.query(models.Medicine)
    .join(models.StockBatch, models.StockBatch.medicine_id == models.Medicine.id)
    .filter(models.StockBatch.qty_available > 5, models.StockBatch.is_active == True)
    .all()
)

payment_methods = [models.PaymentMethod.cash, models.PaymentMethod.upi, models.PaymentMethod.card]

for day_offset in range(-14, 1):
    num_bills = random.randint(3, 8)
    for b in range(num_bills):
        bill_date = TODAY + datetime.timedelta(days=day_offset)
        bill_no = f"BILL{bill_date.strftime('%Y%m%d')}{b+1:04d}"
        existing_bill = db.query(models.Bill).filter_by(bill_no=bill_no).first()
        if existing_bill:
            continue

        patient = random.choice(patient_objects) if patient_objects else None
        num_items = random.randint(1, 4)
        selected_meds = random.sample(med_with_stock, min(num_items, len(med_with_stock)))

        subtotal = 0.0
        bill_items = []
        for med in selected_meds:
            batch = (
                db.query(models.StockBatch)
                .filter_by(medicine_id=med.id, is_active=True)
                .filter(models.StockBatch.qty_available > 0)
                .first()
            )
            if not batch:
                continue
            qty = random.randint(1, 3)
            if batch.qty_available < qty:
                qty = batch.qty_available
            line_total = round(batch.selling_price_per_unit * qty, 2)
            subtotal += line_total
            bill_items.append((med.id, batch.id, qty, batch.selling_price_per_unit, med.gst_percent, line_total))
            batch.qty_available -= qty

        if not bill_items:
            continue

        discount = random.choice([0, 0, 0, 5, 10])
        discount_amount = round(subtotal * discount / 100, 2)
        taxable = subtotal - discount_amount
        cgst = round(taxable * 0.06, 2)
        sgst = round(taxable * 0.06, 2)
        total = round(taxable + cgst + sgst, 2)
        payment = random.choice(payment_methods)

        bill = models.Bill(
            bill_no=bill_no,
            patient_name=patient.name if patient else "Walk-in Customer",
            patient_phone=patient.phone if patient else None,
            patient_id=patient.id if patient else None,
            payment_method=payment,
            subtotal=round(subtotal, 2),
            discount_percent=float(discount),
            discount_amount=discount_amount,
            cgst_amount=cgst,
            sgst_amount=sgst,
            total_amount=total,
            amount_paid=total,
            change_amount=0.0,
            created_by=admin.id,
            created_at=datetime.datetime.combine(bill_date, datetime.time(
                random.randint(9, 20), random.randint(0, 59)
            )),
        )
        db.add(bill)
        db.flush()

        for med_id, batch_id, qty, price, gst, lt in bill_items:
            db.add(models.BillItem(
                bill_id=bill.id,
                medicine_id=med_id,
                batch_id=batch_id,
                qty_sold=qty,
                selling_price_per_unit=price,
                gst_percent=gst,
                line_total=lt,
            ))
        bill_count += 1

db.commit()
print(f"   ✅ {bill_count} bills created across last 14 days")

print("\n" + "═" * 60)
print("  ✅ SEED COMPLETE! Sinha Medicare is ready.")
print("═" * 60)
print(f"""
  🏥 Store   : Sinha Medicare
  🔑 Login   : Username: subhajit | Password: sinha@123
  💊 Medicines: {len(medicines_data)} products with real prices
  👨‍⚕️ Doctors  : {len(doctors_data)} specialists
  🧑‍🤝‍🧑 Patients : {len(patient_objects)} registered patients
  📅 Appts   : {appt_count} appointments
  🧾 Bills   : {bill_count} sales bills (last 14 days)

  📌 NOTE: To upload the Sinha Medicare logo, go to:
     Settings → Shop Details → Upload Logo
""")

db.close()
