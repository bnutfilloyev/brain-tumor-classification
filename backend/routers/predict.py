import os
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
import models_db as m
import schemas as s
from services import inference, dicom

logger = logging.getLogger("tumor_detector")
router = APIRouter(tags=["predict"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads")
GRADCAM_DIR = os.path.join(BASE_DIR, "data", "gradcam")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GRADCAM_DIR, exist_ok=True)


@router.post("/analyze", response_model=s.AnalyzeResult)
async def analyze(
    file: UploadFile = File(...),
    patient_id: Optional[int] = Form(None),
    save: bool = Form(False),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    dicom_meta = None
    source_format = "image"
    try:
        if dicom.is_dicom(file.filename or "", content):
            img, dicom_meta = dicom.read_dicom(content)
            source_format = "dicom"
        else:
            img = inference.load_image_from_bytes(content)
    except Exception as e:
        raise HTTPException(400, f"Could not read file: {e}")

    class_id, class_name, confidence, all_scores, arr = inference.predict_image(img)

    uid = uuid.uuid4().hex
    img_filename = f"{uid}.png"
    img_path = os.path.join(UPLOAD_DIR, img_filename)
    img.convert("L").save(img_path)

    gradcam_filename = f"{uid}_cam.png"
    gradcam_path = os.path.join(GRADCAM_DIR, gradcam_filename)
    gradcam_url = None
    if inference.generate_gradcam(img, arr, class_id, gradcam_path):
        gradcam_url = f"/static/gradcam/{gradcam_filename}"

    study_id = None
    if save and patient_id:
        patient = db.query(m.Patient).filter(m.Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(404, "Patient not found")
        study = m.Study(
            patient_id=patient_id,
            source_format=source_format,
            image_path=f"/static/uploads/{img_filename}",
            dicom_metadata=dicom_meta,
            body_part=(dicom_meta or {}).get("body_part", "Brain"),
            modality=(dicom_meta or {}).get("modality", "MRI"),
        )
        db.add(study)
        db.flush()
        pred = m.Prediction(
            study_id=study.id,
            class_name=class_name,
            class_id=class_id,
            confidence=confidence,
            all_scores=all_scores,
            gradcam_path=gradcam_url,
        )
        db.add(pred)
        db.commit()
        study_id = study.id

    return s.AnalyzeResult(
        class_id=class_id,
        class_name=class_name,
        confidence=confidence,
        all_scores=all_scores,
        gradcam_url=gradcam_url,
        image_url=f"/static/uploads/{img_filename}",
        study_id=study_id,
        dicom_metadata=dicom_meta,
    )


@router.post("/studies/save", response_model=s.StudyOut)
def save_study(payload: s.StudySaveRequest, db: Session = Depends(get_db)):
    """Persist an already-computed analysis to a patient's record.

    The image/Grad-CAM files were written to disk by /analyze, so we only
    create the DB rows here referencing those existing assets.
    """
    patient = db.query(m.Patient).filter(m.Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    study = m.Study(
        patient_id=payload.patient_id,
        source_format=payload.source_format,
        image_path=payload.image_url,
        dicom_metadata=payload.dicom_metadata,
        body_part=(payload.dicom_metadata or {}).get("body_part", "Brain"),
        modality=(payload.dicom_metadata or {}).get("modality", "MRI"),
    )
    db.add(study)
    db.flush()
    pred = m.Prediction(
        study_id=study.id,
        class_name=payload.class_name,
        class_id=payload.class_id,
        confidence=payload.confidence,
        all_scores=payload.all_scores,
        gradcam_path=payload.gradcam_url,
    )
    db.add(pred)
    db.commit()
    db.refresh(study)
    return study


# ---- Legacy base64 endpoint kept for backward compatibility ----
@router.post("/predict", response_model=s.PredictionResponse)
async def predict(data: s.ImageData):
    if not data.image:
        raise HTTPException(400, "No images provided")
    results = []
    for idx, img_data in enumerate(data.image):
        try:
            content = inference.decode_base64_image(img_data)
            img = inference.load_image_from_bytes(content)
            class_id, class_name, confidence, _, _ = inference.predict_image(img)
            results.append(
                s.Result(
                    id=idx + 1,
                    detections=[
                        s.Detection(classId=class_id, className=class_name, confidence=confidence)
                    ],
                )
            )
        except Exception as e:
            logger.error(f"predict error: {e}")
            results.append(
                s.Result(id=idx + 1, detections=[s.Detection(classId=-1, className=f"Error: {e}", confidence=0.0)])
            )
    return s.PredictionResponse(results=results)
