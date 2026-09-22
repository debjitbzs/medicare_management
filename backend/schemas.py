from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────
class UserRole(str, Enum):
    admin = "admin"
    pharmacist = "pharmacist"

class MedicineCategory(str, Enum):
    tablet = "Tablet"
    capsule = "Capsule"
    syrup = "Syrup"
    injection = "Injection"
    drops = "Drops"
    ointment = "Ointment"
    powder = "Powder"
    inhaler = "Inhaler"
    other = "Other"

class PaymentMethod(str, Enum):
    cash = "Cash"
    card = "Card"
    upi = "UPI"

class AppointmentStatus(str, Enum):
    scheduled = "Scheduled"
    completed = "Completed"
    cancelled = "Cancelled"
    no_show = "No Show"

class Gender(str, Enum):
    male = "Male"
    female = "Female"
    other = "Other"


# ─── Auth ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role: UserRole = UserRole.pharmacist

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Supplier ─────────────────────────────────────────────────────────────────
class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_no: Optional[str] = None

class SupplierOut(SupplierCreate):
    id: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Medicine ─────────────────────────────────────────────────────────────────
class MedicineCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: MedicineCategory
    manufacturer: Optional[str] = None
    hsn_code: Optional[str] = None
    unit: str = "Strip"
    rack_location: Optional[str] = None
    min_stock_alert: int = 10
    requires_prescription: bool = False
    gst_percent: float = 12.0
    description: Optional[str] = None

class MedicineUpdate(MedicineCreate):
    pass

class MedicineOut(MedicineCreate):
    id: int
    is_active: bool
    total_stock: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Stock Batch ──────────────────────────────────────────────────────────────
class StockBatchCreate(BaseModel):
    medicine_id: int
    supplier_id: Optional[int] = None
    batch_no: str
    expiry_date: date
    qty_purchased: int
    purchase_price_total: float
    selling_price_per_unit: float
    purchase_date: date
    notes: Optional[str] = None

class StockBatchOut(StockBatchCreate):
    id: int
    qty_available: int
    purchase_price_per_unit: float
    is_active: bool
    created_at: datetime
    medicine_name: Optional[str] = None
    supplier_name: Optional[str] = None
    model_config = {"from_attributes": True}


# ─── Bill ──────────────────────────────────────────────────────────────────────
class BillItemCreate(BaseModel):
    medicine_id: int
    batch_id: Optional[int] = None
    qty_sold: int
    selling_price_per_unit: float
    gst_percent: float = 0.0

class BillItemOut(BillItemCreate):
    id: int
    line_total: float
    medicine_name: Optional[str] = None
    batch_no: Optional[str] = None
    model_config = {"from_attributes": True}

class BillCreate(BaseModel):
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_id: Optional[int] = None
    payment_method: PaymentMethod = PaymentMethod.cash
    discount_percent: float = 0.0
    amount_paid: float = 0.0
    notes: Optional[str] = None
    items: List[BillItemCreate]

class BillOut(BaseModel):
    id: int
    bill_no: str
    patient_name: Optional[str]
    patient_phone: Optional[str]
    payment_method: PaymentMethod
    subtotal: float
    discount_percent: float
    discount_amount: float
    cgst_amount: float
    sgst_amount: float
    total_amount: float
    amount_paid: float
    change_amount: float
    notes: Optional[str]
    created_by: Optional[int] = None
    biller_name: Optional[str] = None
    created_at: datetime
    items: List[BillItemOut] = []
    model_config = {"from_attributes": True}


# ─── Doctor ───────────────────────────────────────────────────────────────────
class DoctorCreate(BaseModel):
    name: str
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    schedule_days: Optional[str] = None
    schedule_time: Optional[str] = None
    consultation_fee: float = 0.0
    room_no: Optional[str] = None

class DoctorOut(DoctorCreate):
    id: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Patient ──────────────────────────────────────────────────────────────────
class PatientCreate(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None

class PatientOut(PatientCreate):
    id: int
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Appointment ──────────────────────────────────────────────────────────────
class AppointmentCreate(BaseModel):
    doctor_id: int
    patient_id: int
    appointment_date: date
    appointment_time: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    token_no: Optional[int] = None

class AppointmentOut(AppointmentCreate):
    id: int
    status: AppointmentStatus
    is_notified: bool
    created_at: datetime
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    doctor_specialization: Optional[str] = None
    model_config = {"from_attributes": True}

class AppointmentUpdate(BaseModel):
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_date: Optional[date] = None


# ─── Dashboard ────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    today_sales: float
    today_bills: int
    today_appointments: int
    low_stock_count: int
    expiry_soon_count: int
    total_medicines: int
    total_patients: int
    monthly_revenue: float

class NotificationItem(BaseModel):
    id: int
    type: str   # "appointment" | "low_stock" | "expiry"
    title: str
    message: str
    data: dict = {}
    created_at: str
