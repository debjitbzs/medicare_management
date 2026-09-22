from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, Time,
    Boolean, Text, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    pharmacist = "pharmacist"


class MedicineCategory(str, enum.Enum):
    tablet = "Tablet"
    capsule = "Capsule"
    syrup = "Syrup"
    injection = "Injection"
    drops = "Drops"
    ointment = "Ointment"
    powder = "Powder"
    inhaler = "Inhaler"
    other = "Other"


class PaymentMethod(str, enum.Enum):
    cash = "Cash"
    card = "Card"
    upi = "UPI"


class AppointmentStatus(str, enum.Enum):
    scheduled = "Scheduled"
    completed = "Completed"
    cancelled = "Cancelled"
    no_show = "No Show"


class Gender(str, enum.Enum):
    male = "Male"
    female = "Female"
    other = "Other"


# ─── Users ───────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.pharmacist)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Suppliers ───────────────────────────────────────────────────────────────
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    gst_no = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stock_batches = relationship("StockBatch", back_populates="supplier")


# ─── Medicines ───────────────────────────────────────────────────────────────
class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    generic_name = Column(String(200))
    category = Column(SAEnum(MedicineCategory), nullable=False)
    manufacturer = Column(String(150))
    hsn_code = Column(String(20))
    unit = Column(String(30), default="Strip")   # Strip, Bottle, Vial, etc.
    rack_location = Column(String(50))
    min_stock_alert = Column(Integer, default=10)
    requires_prescription = Column(Boolean, default=False)
    gst_percent = Column(Float, default=12.0)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    stock_batches = relationship("StockBatch", back_populates="medicine", cascade="all, delete-orphan")
    bill_items = relationship("BillItem", back_populates="medicine")


# ─── Stock Batches ───────────────────────────────────────────────────────────
class StockBatch(Base):
    __tablename__ = "stock_batches"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    batch_no = Column(String(50), nullable=False)
    expiry_date = Column(Date, nullable=False)
    qty_purchased = Column(Integer, nullable=False)
    qty_available = Column(Integer, nullable=False)
    purchase_price_total = Column(Float, nullable=False)   # Total cost for the batch
    purchase_price_per_unit = Column(Float)                # Auto-calculated
    selling_price_per_unit = Column(Float, nullable=False)
    purchase_date = Column(Date, nullable=False)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    medicine = relationship("Medicine", back_populates="stock_batches")
    supplier = relationship("Supplier", back_populates="stock_batches")
    bill_items = relationship("BillItem", back_populates="batch")


# ─── Bills / Sales ───────────────────────────────────────────────────────────
class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_no = Column(String(20), unique=True, nullable=False, index=True)
    patient_name = Column(String(150))
    patient_phone = Column(String(20))
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    payment_method = Column(SAEnum(PaymentMethod), default=PaymentMethod.cash)
    subtotal = Column(Float, default=0.0)
    discount_percent = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    cgst_amount = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    change_amount = Column(Float, default=0.0)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")
    patient = relationship("Patient", back_populates="bills")
    biller = relationship("User", foreign_keys=[created_by])


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("stock_batches.id"), nullable=True)
    qty_sold = Column(Integer, nullable=False)
    selling_price_per_unit = Column(Float, nullable=False)
    gst_percent = Column(Float, default=0.0)
    line_total = Column(Float, nullable=False)

    bill = relationship("Bill", back_populates="items")
    medicine = relationship("Medicine", back_populates="bill_items")
    batch = relationship("StockBatch", back_populates="bill_items")


# ─── Doctors ─────────────────────────────────────────────────────────────────
class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    specialization = Column(String(100))
    qualification = Column(String(150))
    phone = Column(String(20))
    email = Column(String(100))
    schedule_days = Column(String(100))   # e.g. "Mon,Wed,Fri"
    schedule_time = Column(String(50))    # e.g. "09:00-13:00"
    consultation_fee = Column(Float, default=0.0)
    room_no = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointments = relationship("Appointment", back_populates="doctor")


# ─── Patients ────────────────────────────────────────────────────────────────
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    age = Column(Integer)
    gender = Column(SAEnum(Gender))
    phone = Column(String(20), index=True)
    email = Column(String(100))
    address = Column(Text)
    blood_group = Column(String(5))
    allergies = Column(Text)
    medical_history = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointments = relationship("Appointment", back_populates="patient")
    bills = relationship("Bill", back_populates="patient")


# ─── Appointments ─────────────────────────────────────────────────────────────
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(String(10), nullable=False)
    status = Column(SAEnum(AppointmentStatus), default=AppointmentStatus.scheduled)
    reason = Column(String(255))
    notes = Column(Text)
    token_no = Column(Integer)
    is_notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")


# ─── Store Settings ──────────────────────────────────────────────────────────
class StoreSetting(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
