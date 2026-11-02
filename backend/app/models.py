import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaints = relationship("Complaint", back_populates="assigned_worker")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(20), unique=True, index=True, nullable=False)  # e.g. WM-84476
    citizen_name = Column(String(100), nullable=False)
    citizen_email = Column(String(120), nullable=False)
    location_text = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    original_image_url = Column(String(255), nullable=False)
    proof_image_url = Column(String(255), nullable=True)
    status = Column(String(30), default="Assigned")  # 'Pending', 'Assigned', 'Completed'
    
    assigned_worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True)
    assigned_worker = relationship("Worker", back_populates="complaints")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    detections = relationship("WasteDetection", back_populates="complaint", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="complaint", cascade="all, delete-orphan")

class WasteDetection(Base):
    __tablename__ = "waste_detections"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    category = Column(String(100), nullable=False)
    count = Column(Integer, default=1)
    confidence = Column(Float, default=0.9)

    complaint = relationship("Complaint", back_populates="detections")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    recipient = Column(String(120), nullable=False)
    delivery_status = Column(String(30), default="Delivered")
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="notifications")
