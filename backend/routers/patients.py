from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
import models_db as m
import schemas as s
from services.report import build_patient_report

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=List[s.PatientOut])
def list_patients(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(m.Patient)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(m.Patient.full_name.ilike(like), m.Patient.medical_record_no.ilike(like))
        )
    return query.order_by(m.Patient.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=s.PatientOut, status_code=201)
def create_patient(payload: s.PatientCreate, db: Session = Depends(get_db)):
    patient = m.Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=s.PatientDetailOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(m.Patient).filter(m.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    return patient


@router.put("/{patient_id}", response_model=s.PatientOut)
def update_patient(patient_id: int, payload: s.PatientUpdate, db: Session = Depends(get_db)):
    patient = db.query(m.Patient).filter(m.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(patient, k, v)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(m.Patient).filter(m.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    db.delete(patient)
    db.commit()


@router.get("/{patient_id}/report.pdf")
def patient_report(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(m.Patient).filter(m.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    studies = (
        db.query(m.Study)
        .filter(m.Study.patient_id == patient_id)
        .order_by(m.Study.created_at.desc())
        .all()
    )
    pdf = build_patient_report(patient, studies)
    safe = (patient.full_name or "patient").replace(" ", "_")
    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="NeuroScan_{safe}.pdf"'},
    )


@router.get("/{patient_id}/history", response_model=List[s.StudyOut])
def patient_history(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(m.Patient).filter(m.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    return (
        db.query(m.Study)
        .filter(m.Study.patient_id == patient_id)
        .order_by(m.Study.created_at.desc())
        .all()
    )
