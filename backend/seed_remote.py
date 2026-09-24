"""
seed_remote.py — Seeds demo data to the DEPLOYED Render URL via HTTP API
==========================================================================
Run from ANYWHERE (your local machine):

    python seed_remote.py
    python seed_remote.py --url http://localhost:8000   (for local)
"""

import requests
import random
import datetime
import sys
import time

BASE_URL = "https://medicare-management.onrender.com"
if "--url" in sys.argv:
    idx = sys.argv.index("--url")
    if idx + 1 < len(sys.argv):
        BASE_URL = sys.argv[idx + 1].rstrip("/")

TODAY = datetime.date.today()
token = None

print("═" * 65)
print("  Medify — Remote Seed for Sinha Medicare")
print(f"  Target: {BASE_URL}")
print("═" * 65)


def api(method, path, body=None, auth=True, retries=3):
    h = {"Content-Type": "application/json"}
    if auth and token:
        h["Authorization"] = f"Bearer {token}"
    url = f"{BASE_URL}{path}"
    for attempt in range(retries):
        try:
            resp = getattr(requests, method)(url, json=body, headers=h, timeout=30)
            if resp.status_code in (200, 201):
                return resp.json()
            elif resp.status_code == 400:
                return resp.json()   # already exists etc.
            elif resp.status_code == 422:
                print(f"   ❌ Validation error {path}: {resp.text[:200]}")
                return None
            else:
                print(f"   ⚠️  {method.upper()} {path} → {resp.status_code}: {resp.text[:120]}")
                if attempt < retries - 1:
                    time.sleep(2)
        except requests.exceptions.ConnectionError:
            print(f"   ⏳ Server sleeping, waking up... (attempt {attempt+1}/{retries})")
            time.sleep(10)
        except Exception as e:
            print(f"   ❌ {e}")
            if attempt < retries - 1:
                time.sleep(2)
    return None


# ─── STEP 0: Wake up Render ────────────────────────────────────────────────────
print("\n[0] Waking up server (free Render may take 30-50s)...")
for i in range(8):
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=15)
        if r.status_code == 200:
            print(f"   ✅ Server awake!")
            break
    except Exception:
        pass
    print(f"   ⏳ Waiting... ({(i+1)*10}s)")
    time.sleep(10)
else:
    print("   ❌ Cannot reach server. Check URL.")
    sys.exit(1)


# ─── STEP 1: Setup / Login ─────────────────────────────────────────────────────
print("\n[1/7] Checking store setup...")
status = api("get", "/api/auth/setup-status", auth=False)
is_first_run = status.get("is_first_run", True) if status else True

if is_first_run:
    print("   🏗️  First run — creating store + admin...")
    result = api("post", "/api/auth/setup", {
        "store_name":       "Sinha Medicare",
        "store_phone":      "7003126139",
        "store_email":      "debjitbzs@gmail.com",
        "admin_full_name":  "Subhajit Sinha",
        "admin_username":   "subhajit",
        "admin_password":   "sinha@123",
        "store_language":   "en",
    }, auth=False)
    if result and result.get("access_token"):
        token = result["access_token"]
        print("   ✅ Store created, logged in as subhajit")
    else:
        print(f"   ❌ Setup failed: {result}")
        sys.exit(1)
else:
    print("   ℹ️  Store exists — logging in...")
    result = api("post", "/api/auth/login", {
        "username": "subhajit",
        "password": "sinha@123",
    }, auth=False)
    if result and result.get("access_token"):
        token = result["access_token"]
        print("   ✅ Logged in as subhajit")
    else:
        print("   ❌ Login failed.")
        sys.exit(1)


# ─── STEP 2: Store Settings ─────────────────────────────────────────────────────
print("\n[2/7] Updating store settings...")
# Settings uses PUT, not POST
api("put", "/api/settings", {
    "store_name":        "Sinha Medicare",
    "store_phone":       "7003126139",
    "store_email":       "debjitbzs@gmail.com",
    "store_address":     "14, Panchanantala Road, Sodepur, Kolkata - 700110",
    "store_gst":         "19AABCS1234A1Z5",
    "store_license":     "WB-KOL-2024-00812",
    "currency_symbol":   "₹",
    "low_stock_days":    "90",
    "expiry_alert_days": "90",
})
print("   ✅ Store settings updated")

# Staff user
api("post", "/api/auth/users", {
    "username":  "debjit",
    "full_name": "Debjit Sinha",
    "email":     "debjit@sinhamedicare.in",
    "password":  "debjit@123",
    "role":      "pharmacist",
})
print("   ✅ Staff: debjit / debjit@123")


# ─── STEP 3: Medicines ─────────────────────────────────────────────────────────
print("\n[3/7] Adding 100 medicines with stock batches...")

medicines_data = [
    # (name, generic, category, manufacturer, unit, purchase_total_per_strip, sell_price)
    ("Calpol 500mg",           "Paracetamol",                        "Tablet",   "GSK",             "Strip",  18.50,  22.00),
    ("Dolo 650mg",             "Paracetamol 650mg",                  "Tablet",   "Micro Labs",       "Strip",  26.00,  31.00),
    ("Combiflam",              "Ibuprofen + Paracetamol",            "Tablet",   "Sanofi",           "Strip",  29.50,  35.00),
    ("Voveran 50mg",           "Diclofenac Sodium",                  "Tablet",   "Novartis",         "Strip",  34.00,  40.00),
    ("Meftal Spas",            "Mefenamic Acid + Dicyclomine",       "Tablet",   "Blue Cross",       "Strip",  38.00,  45.00),
    ("Metformin 500mg",        "Metformin HCl",                      "Tablet",   "USV",              "Strip",  24.00,  30.00),
    ("Glucophage 500mg",       "Metformin",                          "Tablet",   "Merck",            "Strip",  38.00,  45.00),
    ("Glycomet GP2",           "Glimepiride + Metformin",            "Tablet",   "USV",              "Strip",  72.00,  85.00),
    ("Amaryl 2mg",             "Glimepiride",                        "Tablet",   "Sanofi",           "Strip",  65.00,  78.00),
    ("Atorvastatin 10mg",      "Atorvastatin",                       "Tablet",   "Sun Pharma",       "Strip",  48.00,  58.00),
    ("Lipitor 20mg",           "Atorvastatin",                       "Tablet",   "Pfizer",           "Strip",  98.00, 118.00),
    ("Rosuvas 10mg",           "Rosuvastatin",                       "Tablet",   "Sun Pharma",       "Strip",  84.00, 100.00),
    ("Ecosprin 75mg",          "Aspirin",                            "Tablet",   "USV",              "Strip",  12.50,  15.00),
    ("Ecosprin 150mg",         "Aspirin 150mg",                      "Tablet",   "USV",              "Strip",  18.00,  22.00),
    ("Telma 40mg",             "Telmisartan",                        "Tablet",   "Glenmark",         "Strip",  88.00, 105.00),
    ("Amlodipine 5mg",         "Amlodipine Besylate",                "Tablet",   "Cipla",            "Strip",  32.00,  38.00),
    ("Stamlo 5mg",             "Amlodipine",                         "Tablet",   "Dr Reddys",        "Strip",  45.00,  54.00),
    ("Atenolol 50mg",          "Atenolol",                           "Tablet",   "Alkem",            "Strip",  22.00,  26.00),
    ("Metoprolol 50mg",        "Metoprolol",                         "Tablet",   "Sun Pharma",       "Strip",  38.00,  45.00),
    ("Lasix 40mg",             "Furosemide",                         "Tablet",   "Sanofi",           "Strip",  16.00,  20.00),
    ("Pantoprazole 40mg",      "Pantoprazole",                       "Tablet",   "Sun Pharma",       "Strip",  42.00,  50.00),
    ("Pan 40mg",               "Pantoprazole",                       "Tablet",   "Alkem",            "Strip",  35.00,  42.00),
    ("Omez 20mg",              "Omeprazole",                         "Tablet",   "Dr Reddys",        "Strip",  28.00,  34.00),
    ("Rablet 20mg",            "Rabeprazole",                        "Tablet",   "Lupin",            "Strip",  55.00,  66.00),
    ("Cetirizine 10mg",        "Cetirizine HCl",                     "Tablet",   "Cipla",            "Strip",  14.00,  18.00),
    ("Montair LC",             "Montelukast + Levocetirizine",       "Tablet",   "Cipla",            "Strip",  98.00, 118.00),
    ("Levocet M",              "Levocetirizine + Montelukast",       "Tablet",   "USV",              "Strip",  88.00, 105.00),
    ("Allegra 120mg",          "Fexofenadine",                       "Tablet",   "Sanofi",           "Strip", 115.00, 138.00),
    ("Azithromycin 500mg",     "Azithromycin",                       "Tablet",   "Cipla",            "Strip",  68.00,  82.00),
    ("Azithral 500mg",         "Azithromycin",                       "Tablet",   "Alembic",          "Strip",  72.00,  86.00),
    ("Augmentin 625mg",        "Amoxicillin + Clavulanic Acid",      "Tablet",   "GSK",              "Strip", 185.00, 220.00),
    ("Ciprofloxacin 500mg",    "Ciprofloxacin",                      "Tablet",   "Cipla",            "Strip",  38.00,  46.00),
    ("Norflox TZ",             "Norfloxacin + Tinidazole",           "Tablet",   "Alkem",            "Strip",  52.00,  62.00),
    ("Ofloxacin 200mg",        "Ofloxacin",                          "Tablet",   "Cipla",            "Strip",  42.00,  50.00),
    ("Metronidazole 400mg",    "Metronidazole",                      "Tablet",   "Pfizer",           "Strip",  18.00,  22.00),
    ("Alprazolam 0.25mg",      "Alprazolam",                         "Tablet",   "Sun Pharma",       "Strip",  28.00,  34.00),
    ("Clonazepam 0.5mg",       "Clonazepam",                         "Tablet",   "Sun Pharma",       "Strip",  35.00,  42.00),
    ("Sertraline 50mg",        "Sertraline HCl",                     "Tablet",   "Lupin",            "Strip",  85.00, 102.00),
    ("Escitalopram 10mg",      "Escitalopram Oxalate",               "Tablet",   "Sun Pharma",       "Strip",  78.00,  94.00),
    ("Thyronorm 50mcg",        "Levothyroxine",                      "Tablet",   "Abbott",           "Strip",  32.00,  38.00),
    ("Eltroxin 50mcg",         "Levothyroxine",                      "Tablet",   "GSK",              "Strip",  28.00,  34.00),
    ("Calcium Sandoz 500mg",   "Calcium Carbonate + Vit D3",         "Tablet",   "Sandoz",           "Strip",  45.00,  54.00),
    ("Shelcal 500mg",          "Calcium + Vitamin D3",               "Tablet",   "Elder",            "Strip",  52.00,  62.00),
    ("Methylcobalamin 500mcg", "Methylcobalamin",                    "Tablet",   "Sun Pharma",       "Strip",  65.00,  78.00),
    ("Neurobion Forte",        "Vitamin B-Complex",                  "Tablet",   "Merck",            "Strip",  38.00,  46.00),
    ("Folic Acid 5mg",         "Folic Acid",                         "Tablet",   "Abbott",           "Strip",  15.00,  18.00),
    ("Ranitidine 150mg",       "Ranitidine",                         "Tablet",   "Cipla",            "Strip",  22.00,  26.00),
    ("Montair 10mg",           "Montelukast",                        "Tablet",   "Cipla",            "Strip",  55.00,  66.00),
    ("Aceclofenac 100mg",      "Aceclofenac",                        "Tablet",   "Aristo",           "Strip",  38.00,  46.00),
    ("Zerodol SP",             "Aceclofenac + Serratiopeptidase",    "Tablet",   "Ipca",             "Strip",  75.00,  90.00),
    # Capsules
    ("Amoxicillin 500mg",      "Amoxicillin",                        "Capsule",  "GSK",              "Strip",  45.00,  54.00),
    ("Doxycycline 100mg",      "Doxycycline",                        "Capsule",  "Lupin",            "Strip",  35.00,  42.00),
    ("Fluconazole 150mg",      "Fluconazole",                        "Capsule",  "Cipla",            "Strip",  62.00,  74.00),
    ("Omez Capsule 20mg",      "Omeprazole",                         "Capsule",  "Dr Reddys",        "Strip",  30.00,  36.00),
    ("Pregabalin 75mg",        "Pregabalin",                         "Capsule",  "Sun Pharma",       "Strip",  82.00,  98.00),
    ("Gabapin NT 100",         "Gabapentin",                         "Capsule",  "Intas",            "Strip",  95.00, 114.00),
    ("Duloxetine 30mg",        "Duloxetine HCl",                     "Capsule",  "Lupin",            "Strip", 112.00, 134.00),
    ("Pantocid D",             "Pantoprazole + Domperidone",         "Capsule",  "Sun Pharma",       "Strip",  58.00,  70.00),
    ("Becosules Capsules",     "B-Complex + Vitamin C",              "Capsule",  "Pfizer",           "Strip",  72.00,  86.00),
    ("Revital H",              "Multivitamin + Minerals",            "Capsule",  "Ranbaxy",          "Strip", 148.00, 178.00),
    # Syrups
    ("Calpol Syrup 120ml",     "Paracetamol Suspension",             "Syrup",    "GSK",              "Bottle", 42.00,  52.00),
    ("Ibugesic Syrup",         "Ibuprofen Suspension",               "Syrup",    "Cipla",            "Bottle", 48.00,  58.00),
    ("Cetirizine Syrup",       "Cetirizine HCl",                     "Syrup",    "Sun Pharma",       "Bottle", 38.00,  46.00),
    ("Benadryl Cough Syrup",   "Diphenhydramine + Amm Chloride",     "Syrup",    "J and J",          "Bottle", 52.00,  62.00),
    ("Ascoril LS Syrup",       "Levosalbutamol + Ambroxol",          "Syrup",    "Glenmark",         "Bottle", 88.00, 105.00),
    ("Honitus Syrup",          "Tulsi + Ginger Extract",             "Syrup",    "Dabur",            "Bottle", 52.00,  62.00),
    ("Alex Syrup",             "Chlorpheniramine + Phenylephrine",   "Syrup",    "Glenmark",         "Bottle", 45.00,  54.00),
    ("Asthalin Syrup",         "Salbutamol",                         "Syrup",    "Cipla",            "Bottle", 32.00,  38.00),
    ("Digene Syrup",           "Aluminium Hydroxide + Magnesium",    "Syrup",    "Abbott",           "Bottle", 58.00,  70.00),
    ("Gelusil Syrup",          "Al Hydroxide + Mg Hydroxide",        "Syrup",    "Pfizer",           "Bottle", 52.00,  62.00),
    ("Cremaffin Syrup",        "Liquid Paraffin + Milk of Magnesia", "Syrup",    "Abbott",           "Bottle", 72.00,  86.00),
    ("Duphalac Syrup",         "Lactulose",                          "Syrup",    "Abbott",           "Bottle", 148.00, 178.00),
    ("Electral Powder",        "ORS Electrolytes",                   "Syrup",    "FDC",              "Sachet",  8.00,  10.00),
    ("Ambroxol Syrup",         "Ambroxol HCl",                       "Syrup",    "Cipla",            "Bottle", 42.00,  50.00),
    ("Bromhexine Syrup",       "Bromhexine HCl",                     "Syrup",    "German Remedies",  "Bottle", 38.00,  46.00),
    ("Zincovit Syrup",         "Zinc + Multivitamin",                "Syrup",    "Apex",             "Bottle", 62.00,  74.00),
    ("Livogen Syrup",          "Ferrous Fumarate + Folic Acid",      "Syrup",    "Merck",            "Bottle", 68.00,  82.00),
    ("Calvit Syrup",           "Calcium + Vitamin D3",               "Syrup",    "Sun Pharma",       "Bottle", 72.00,  86.00),
    ("Taxim O Syrup",          "Cefixime",                           "Syrup",    "Alkem",            "Bottle", 118.00, 142.00),
    ("Oflox Syrup",            "Ofloxacin",                          "Syrup",    "Cipla",            "Bottle", 68.00,  82.00),
    ("Sporidex Syrup",         "Cephalexin",                         "Syrup",    "Ranbaxy",          "Bottle", 95.00, 114.00),
    ("Clavam 228.5 Syrup",     "Amoxicillin + Clavulanate",          "Syrup",    "Alkem",            "Bottle", 148.00, 178.00),
    ("Pedialyte 200ml",        "ORS for Children",                   "Syrup",    "Abbott",           "Bottle", 88.00, 105.00),
    ("Fer-In-Sol Syrup",       "Ferrous Sulphate",                   "Syrup",    "Mead Johnson",     "Bottle", 55.00,  66.00),
    ("Betadine Gargle",        "Povidone Iodine",                    "Syrup",    "Win Medicare",     "Bottle", 45.00,  54.00),
    # Ointments
    ("Volini Gel",             "Diclofenac + Methyl Salicylate",     "Ointment", "Sun Pharma",       "Tube",   88.00, 105.00),
    ("Betadine Ointment",      "Povidone Iodine",                    "Ointment", "Win Medicare",     "Tube",   52.00,  62.00),
    ("Soframycin Cream",       "Framycetin",                         "Ointment", "Sanofi",           "Tube",   48.00,  58.00),
    ("Candid B Cream",         "Clotrimazole + Beclomethasone",      "Ointment", "Glenmark",         "Tube",   65.00,  78.00),
    ("Terbinafine 1%",         "Terbinafine HCl",                    "Ointment", "Novartis",         "Tube",   78.00,  94.00),
    ("Clobetasol Cream",       "Clobetasol Propionate",              "Ointment", "Cipla",            "Tube",   42.00,  50.00),
    ("Hydrocortisone 1%",      "Hydrocortisone",                     "Ointment", "Sun Pharma",       "Tube",   35.00,  42.00),
    ("Diclofenac Gel",         "Diclofenac Sodium",                  "Ointment", "Novartis",         "Tube",   62.00,  75.00),
    ("Hexigel Oral",           "Chlorhexidine Gluconate",            "Ointment", "ICPA",             "Tube",   38.00,  46.00),
    ("Decdan Syrup",           "Dexamethasone",                      "Syrup",    "Lupin",            "Bottle", 48.00,  58.00),
]

cat_map = {
    "Tablet": "Tablet", "Capsule": "Capsule",
    "Syrup":  "Syrup",  "Ointment": "Ointment",
}

created_med_ids = []
print(f"   Adding {len(medicines_data)} medicines...")

for i, (name, generic, cat, mfr, unit, buy_price, sell_price) in enumerate(medicines_data):
    qty = random.randint(80, 200)

    # 1. Create medicine
    med = api("post", "/api/medicines", {
        "name":                  name,
        "generic_name":          generic,
        "category":              cat_map.get(cat, "Other"),
        "manufacturer":          mfr,
        "unit":                  unit,
        "gst_percent":           12.0,
        "min_stock_alert":       10,
        "requires_prescription": False,
    })

    if not med or "id" not in med:
        # Might already exist — fetch list and find it
        meds_list = api("get", f"/api/medicines?search={name[:10]}")
        if meds_list:
            found = next((m for m in meds_list if m["name"] == name), None)
            if found:
                med = found

    if not med or "id" not in med:
        continue

    med_id = med["id"]
    created_med_ids.append(med_id)

    # 2. Add stock batch — correct endpoint: /api/stock/batches
    api("post", "/api/stock/batches", {
        "medicine_id":            med_id,
        "batch_no":               f"BT{i+1:04d}",
        "expiry_date":            (TODAY.replace(year=TODAY.year + 2)).isoformat(),
        "qty_purchased":          qty,
        "purchase_price_total":   round(buy_price * qty, 2),
        "selling_price_per_unit": sell_price,
        "purchase_date":          (TODAY - datetime.timedelta(days=random.randint(10, 60))).isoformat(),
    })

    if (i + 1) % 20 == 0:
        print(f"   ... {i+1}/{len(medicines_data)} done")

print(f"   ✅ {len(created_med_ids)} medicines with stock batches")


# ─── STEP 4: Doctors ───────────────────────────────────────────────────────────
print("\n[4/7] Creating doctors...")

doctors_data = [
    ("Riddhiman Ghosh",    "General Medicine",         "MBBS",             "9831011223", "Mon,Tue,Wed,Thu,Fri", "10:00-14:00", 300.0),
    ("Dibyendu Sinha",     "General Physician",        "MBBS",             "9831022334", "Mon,Wed,Fri",         "17:00-21:00", 300.0),
    ("Priya Sharma",       "Gynaecology & Obstetrics", "MBBS, MD (Gynae)", "9830033445", "Tue,Thu,Sat",         "10:00-14:00", 500.0),
    ("Suresh Mondal",      "Paediatrics",              "MBBS, MD (Paeds)", "9830044556", "Mon,Wed,Fri,Sat",     "09:00-13:00", 450.0),
    ("Ananya Bose",        "Dermatology",              "MBBS, MD (Derm)",  "9831055667", "Tue,Thu",             "11:00-15:00", 600.0),
    ("Rajesh Kumar",       "Cardiology",               "MBBS, MD, DM",     "9830066778", "Mon,Tue,Thu",         "09:00-13:00", 800.0),
    ("Santanu Das",        "Orthopaedics",             "MBBS, MS (Ortho)", "9831077889", "Wed,Fri,Sat",         "10:00-14:00", 500.0),
    ("Mousumi Chatterjee", "Endocrinology",            "MBBS, MD, DM",     "9830088990", "Mon,Thu",             "14:00-18:00", 700.0),
    ("Subrata Pal",        "Neurology",                "MBBS, MD, DM",     "9831099001", "Tue,Fri",             "10:00-14:00", 800.0),
    ("Rituparna Sen",      "Ophthalmology",            "MBBS, MS (Ophth)", "9830010112", "Mon,Wed,Sat",         "09:00-13:00", 400.0),
]

doctor_ids = []
for name, spec, qual, phone, days, sched, fee in doctors_data:
    result = api("post", "/api/doctors", {
        "name": name, "specialization": spec, "qualification": qual,
        "phone": phone, "schedule_days": days, "schedule_time": sched,
        "consultation_fee": fee,
    })
    if result and "id" in result:
        doctor_ids.append(result["id"])

# If some already existed, fetch all
if len(doctor_ids) < len(doctors_data):
    all_docs = api("get", "/api/doctors")
    if all_docs:
        doctor_ids = [d["id"] for d in all_docs]

print(f"   ✅ {len(doctor_ids)} doctors ready")


# ─── STEP 5: Patients ──────────────────────────────────────────────────────────
print("\n[5/7] Creating patients...")

patients_raw = [
    ("Ramesh Sharma",      45, "Male",   "9830100001", "A+"),
    ("Sunita Devi",        38, "Female", "9830100002", "B+"),
    ("Kartik Biswas",      62, "Male",   "9830100003", "O+"),
    ("Priya Roy",          28, "Female", "9830100004", "AB+"),
    ("Suresh Ghosh",       55, "Male",   "9830100005", "A-"),
    ("Meera Banerjee",     42, "Female", "9830100006", "B-"),
    ("Arun Kumar",         70, "Male",   "9830100007", "O-"),
    ("Lalita Singh",       33, "Female", "9830100008", "B+"),
    ("Dipankar Das",       48, "Male",   "9830100009", "A+"),
    ("Anita Chakraborty",  52, "Female", "9830100010", "O+"),
    ("Bikash Mondal",      39, "Male",   "9830100011", "AB-"),
    ("Rupa Sen",           27, "Female", "9830100012", "A+"),
    ("Nikhil Bose",        58, "Male",   "9830100013", "B+"),
    ("Srabanti Pal",       35, "Female", "9830100014", "O+"),
    ("Tapas Saha",         66, "Male",   "9830100015", "A+"),
]

patient_ids = []
for name, age, gender, phone, blood in patients_raw:
    result = api("post", "/api/patients", {
        "name": name, "age": age, "gender": gender,
        "phone": phone, "blood_group": blood,
        "address": "Kolkata, West Bengal",
    })
    if result and "id" in result:
        patient_ids.append(result["id"])

print(f"   ✅ {len(patient_ids)} patients created")


# ─── STEP 6: Appointments ──────────────────────────────────────────────────────
print("\n[6/7] Booking appointments...")

times  = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","14:00","14:30","15:00"]
reasons = ["Fever and cold","Routine check-up","BP monitoring","Diabetes follow-up",
           "Skin rash","Joint pain","Chest discomfort","Eye irritation","Child vaccination","Thyroid check"]

appt_count = 0
for i, pat_id in enumerate(patient_ids[:12]):
    doc_id = doctor_ids[i % len(doctor_ids)] if doctor_ids else None
    if not doc_id:
        continue
    appt_date = (TODAY + datetime.timedelta(days=random.randint(-3, 5))).isoformat()
    result = api("post", "/api/appointments", {
        "doctor_id":        doc_id,
        "patient_id":       pat_id,
        "appointment_date": appt_date,
        "appointment_time": times[i % len(times)],
        "reason":           reasons[i % len(reasons)],
    })
    if result and "id" in result:
        appt_count += 1

print(f"   ✅ {appt_count} appointments booked")


# ─── STEP 7: Sales Bills ───────────────────────────────────────────────────────
print("\n[7/7] Creating sales bills (last 14 days)...")

# Get all medicines to bill
all_meds = api("get", "/api/medicines?limit=200") or []
payment_methods = ["Cash", "UPI", "Card"]

bill_count = 0
for day_offset in range(-13, 1):
    bill_date = (TODAY + datetime.timedelta(days=day_offset)).isoformat()
    for b in range(random.randint(2, 6)):
        if not all_meds:
            break
        selected = random.sample(all_meds, min(random.randint(1, 3), len(all_meds)))
        patient_name, _, _, patient_phone, _ = random.choice(patients_raw)

        items = []
        for med in selected:
            # Find a reasonable price from the medicines data
            matching = next((m for m in medicines_data if m[0] == med["name"]), None)
            sell_price = matching[6] if matching else round(random.uniform(20, 150), 2)
            items.append({
                "medicine_id":            med["id"],
                "qty_sold":               random.randint(1, 3),
                "selling_price_per_unit": sell_price,
                "gst_percent":            12.0,
            })

        if not items:
            continue

        result = api("post", "/api/sales", {
            "patient_name":    patient_name,
            "patient_phone":   patient_phone,
            "payment_method":  random.choice(payment_methods),
            "discount_percent": random.choice([0, 0, 0, 5, 10]),
            "amount_paid":     9999.0,
            "items":           items,
            "notes":           "",
        })
        if result and "id" in result:
            bill_count += 1

print(f"   ✅ {bill_count} bills created")


print("\n" + "═" * 65)
print("  ✅  REMOTE SEED COMPLETE!")
print("═" * 65)
print(f"""
  🌐 URL        : {BASE_URL}
  🏥 Store      : Sinha Medicare
  🔑 Admin      : subhajit / sinha@123
  👤 Staff      : debjit / debjit@123
  💊 Medicines  : {len(created_med_ids)} with stock batches
  👨‍⚕️  Doctors    : {len(doctor_ids)} specialists
  🧑  Patients   : {len(patient_ids)} patients
  📅  Appts      : {appt_count} appointments
  🧾  Bills      : {bill_count} sales (last 14 days)
""")
