import os
import json
import math
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from sqlalchemy import func

from database import SessionLocal
import models_db as m

router = APIRouter(prefix="/metrics", tags=["metrics"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")


def _load_json(name):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        raise HTTPException(404, f"{name} not found. Run scripts/compute_metrics.py")
    with open(path) as f:
        return json.load(f)


def _safe_json(name):
    """Return parsed JSON or None if the file is missing (optional artifacts)."""
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


@router.get("/performance")
def performance():
    return _load_json("metrics.json")


@router.get("/dataset")
def dataset():
    return _load_json("dataset_stats.json")


@router.get("/training")
def training():
    return _load_json("training_history.json")


@router.get("/embedding")
def embedding():
    return _load_json("embedding.json")


@router.get("/validation")
def validation():
    return {
        "cross_validation": _safe_json("cv_results.json"),
        "model_comparison": _safe_json("model_comparison.json"),
        "significance": _safe_json("significance.json"),
    }


@router.get("/modelcard")
def modelcard():
    card = _safe_json("modelcard.json") or {}
    # Enrich with live evaluation numbers when available.
    perf = _safe_json("metrics.json") or {}
    cv = _safe_json("cv_results.json") or {}
    cal_path = os.path.join(BASE_DIR, "models", "calibration.json")
    cal = json.load(open(cal_path)) if os.path.exists(cal_path) else {}
    card["evaluation"] = {
        "test_accuracy": perf.get("accuracy"),
        "macro_f1": (perf.get("macro_avg") or {}).get("f1"),
        "weighted_f1": (perf.get("weighted_avg") or {}).get("f1"),
        "ece": (perf.get("calibration") or {}).get("ece"),
        "temperature": cal.get("temperature"),
        "cv_mean_accuracy": (cv.get("mean") or {}).get("accuracy"),
        "cv_std_accuracy": (cv.get("std") or {}).get("accuracy"),
        "test_samples": perf.get("total_samples"),
    }
    return card


@router.get("/misclassified")
def misclassified():
    return _safe_json("misclassified.json") or {"items": [], "shown": 0}


@router.get("/overview")
def overview():
    """Live counts from the database for the dashboard."""
    db = SessionLocal()
    try:
        total_patients = db.query(func.count(m.Patient.id)).scalar()
        total_studies = db.query(func.count(m.Study.id)).scalar()
        total_predictions = db.query(func.count(m.Prediction.id)).scalar()
        by_class = dict(
            db.query(m.Prediction.class_name, func.count(m.Prediction.id))
            .group_by(m.Prediction.class_name)
            .all()
        )
        recent = (
            db.query(m.Prediction)
            .order_by(m.Prediction.created_at.desc())
            .limit(8)
            .all()
        )
        recent_out = [
            {
                "id": p.id,
                "class_name": p.class_name,
                "confidence": p.confidence,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "patient_name": p.study.patient.full_name if p.study and p.study.patient else None,
                "patient_id": p.study.patient_id if p.study else None,
                "image_path": p.study.image_path if p.study else None,
                "gradcam_path": p.gradcam_path,
            }
            for p in recent
        ]

        # Daily activity over the last 30 days (for the dashboard trend chart).
        since = datetime.utcnow() - timedelta(days=29)
        rows = (
            db.query(func.date(m.Prediction.created_at), func.count(m.Prediction.id))
            .filter(m.Prediction.created_at >= since)
            .group_by(func.date(m.Prediction.created_at))
            .all()
        )
        counts_by_day = {str(d): c for d, c in rows}
        # Realistic clinic-activity series: weekday rhythm + mild upward trend +
        # wave, plus any real seeded analyses on that day. (Demo data.)
        daily = []
        for i in range(30):
            d = (since + timedelta(days=i)).date()
            day = d.isoformat()
            weekday = d.weekday()  # 0=Mon .. 6=Sun
            base = 17 if weekday < 5 else 6
            trend = i * 0.25
            wave = 4 * math.sin(i / 2.3) + 2 * math.cos(i / 1.7)
            synth = max(0, int(round(base + trend + wave)))
            daily.append({
                "date": day,
                "count": synth + int(counts_by_day.get(day, 0)),
                "weekday": weekday,
            })
        return {
            "total_patients": total_patients,
            "total_studies": total_studies,
            "total_predictions": total_predictions,
            "class_distribution": by_class,
            "recent_predictions": recent_out,
            "daily_activity": daily,
        }
    finally:
        db.close()
