from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Date,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship

from database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False, index=True)
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)  # male / female / other
    medical_record_no = Column(String, nullable=True, unique=False)
    phone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    studies = relationship(
        "Study", back_populates="patient", cascade="all, delete-orphan"
    )


class Study(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    modality = Column(String, default="MRI")
    body_part = Column(String, default="Brain")
    image_path = Column(String, nullable=True)
    source_format = Column(String, default="image")  # image / dicom
    dicom_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="studies")
    prediction = relationship(
        "Prediction",
        back_populates="study",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id"), nullable=False)
    class_name = Column(String, nullable=False)
    class_id = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=False)
    all_scores = Column(JSON, nullable=True)
    gradcam_path = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    study = relationship("Study", back_populates="prediction")
