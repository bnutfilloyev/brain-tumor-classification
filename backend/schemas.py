from datetime import datetime, date
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


# ---------- Legacy predict schemas (kept for compatibility) ----------
class ImageData(BaseModel):
    image: List[str] = Field(..., description="List of base64 encoded images")


class Detection(BaseModel):
    classId: int
    className: str
    confidence: float


class Result(BaseModel):
    detections: List[Detection]
    id: Optional[int] = None


class PredictionResponse(BaseModel):
    results: List[Result]


# ---------- Patient schemas ----------
class PatientBase(BaseModel):
    full_name: str
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    medical_record_no: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    medical_record_no: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class PredictionOut(BaseModel):
    id: int
    class_name: str
    class_id: Optional[int] = None
    confidence: float
    all_scores: Optional[Dict[str, Any]] = None
    gradcam_path: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudyOut(BaseModel):
    id: int
    patient_id: int
    modality: str
    body_part: str
    image_path: Optional[str] = None
    source_format: str
    dicom_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    prediction: Optional[PredictionOut] = None

    class Config:
        from_attributes = True


class PatientOut(PatientBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PatientDetailOut(PatientOut):
    studies: List[StudyOut] = []


# ---------- Analyze / AI schemas ----------
class AnalyzeResult(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    all_scores: Dict[str, float]
    gradcam_url: Optional[str] = None
    image_url: Optional[str] = None
    study_id: Optional[int] = None
    dicom_metadata: Optional[Dict[str, Any]] = None


class StudySaveRequest(BaseModel):
    patient_id: int
    class_id: int
    class_name: str
    confidence: float
    all_scores: Dict[str, float]
    image_url: Optional[str] = None
    gradcam_url: Optional[str] = None
    source_format: str = "image"
    dicom_metadata: Optional[Dict[str, Any]] = None


class AISummaryRequest(BaseModel):
    class_name: str
    confidence: float
    language: str = "en"
    patient_context: Optional[str] = None


class AISummaryResponse(BaseModel):
    summary: str
    model: str
    fallback: bool = False


class ChatMessage(BaseModel):
    role: str  # user / assistant
    content: str


class AIChatRequest(BaseModel):
    messages: List[ChatMessage]
    class_name: Optional[str] = None
    confidence: Optional[float] = None
    language: str = "en"


class AIChatResponse(BaseModel):
    reply: str
    model: str
    fallback: bool = False
