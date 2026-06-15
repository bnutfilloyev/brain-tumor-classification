"""Populate the database with realistic mock patients, studies and predictions.

Each study is backed by a real sample MRI image (see scripts/fetch_samples.py),
run through the actual model to produce genuine probabilities and a Grad-CAM
overlay. Run from the backend/ directory:  python data/seed.py
"""
import os
import sys
import uuid
import shutil
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, init_db  # noqa: E402
import models_db as m  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES_DIR = os.path.join(BASE_DIR, "data", "samples")
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads")
GRADCAM_DIR = os.path.join(BASE_DIR, "data", "gradcam")

# Fallback probability profiles if the model can't be loaded.
CLASS_SCORES = {
    "Glioma": {"Glioma": 94.2, "Meningioma": 3.1, "Notumor": 1.0, "Pituitary": 1.7},
    "Meningioma": {"Glioma": 2.8, "Meningioma": 95.6, "Notumor": 0.9, "Pituitary": 0.7},
    "Notumor": {"Glioma": 0.5, "Meningioma": 0.6, "Notumor": 97.8, "Pituitary": 1.1},
    "Pituitary": {"Glioma": 1.4, "Meningioma": 1.9, "Notumor": 0.8, "Pituitary": 95.9},
}
CLASS_ID = {"Glioma": 0, "Meningioma": 1, "Notumor": 2, "Pituitary": 3}

PATIENTS = [
    ("Aziz Karimov", "male", 1985, "MR-1001", ["Glioma", "Glioma"]),
    ("Dilnoza Yusupova", "female", 1990, "MR-1002", ["Meningioma"]),
    ("John Mitchell", "male", 1978, "MR-1003", ["Pituitary", "Pituitary"]),
    ("Sara Ahmadova", "female", 2001, "MR-1004", ["Notumor"]),
    ("Bekzod Toirov", "male", 1969, "MR-1005", ["Glioma"]),
    ("Emily Carter", "female", 1995, "MR-1006", ["Meningioma", "Meningioma"]),
    ("Rustam Alimov", "male", 1982, "MR-1007", ["Pituitary"]),
    ("Nigora Saidova", "female", 1973, "MR-1008", ["Notumor", "Notumor"]),
    ("Michael Brown", "male", 1960, "MR-1009", ["Glioma", "Meningioma"]),
    ("Kamola Rashidova", "female", 1988, "MR-1010", ["Pituitary"]),
    ("David Lee", "male", 1992, "MR-1011", ["Notumor"]),
    ("Gulnora Hamidova", "female", 1965, "MR-1012", ["Meningioma"]),
    ("Sherzod Nazarov", "male", 1979, "MR-1013", ["Glioma"]),
    ("Laura Schmidt", "female", 1986, "MR-1014", ["Pituitary", "Notumor"]),
    ("Oybek Ergashev", "male", 2003, "MR-1015", ["Notumor"]),
    ("Maria Garcia", "female", 1971, "MR-1016", ["Meningioma"]),
    ("Jasur Qodirov", "male", 1958, "MR-1017", ["Glioma", "Glioma"]),
    ("Feruza Tosheva", "female", 1998, "MR-1018", ["Notumor"]),
]


def _sample_pool():
    pool = {}
    if not os.path.isdir(SAMPLES_DIR):
        return pool
    for cls in CLASS_ID:
        d = os.path.join(SAMPLES_DIR, cls)
        if os.path.isdir(d):
            pool[cls] = [os.path.join(d, f) for f in sorted(os.listdir(d))
                         if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    return pool


def _process_sample(src_path, finding, inference):
    """Copy sample to uploads, run model + Grad-CAM. Returns dict or None."""
    from PIL import Image

    uid = uuid.uuid4().hex
    img = Image.open(src_path)
    img_filename = f"{uid}.png"
    img.convert("L").save(os.path.join(UPLOAD_DIR, img_filename))

    result = {
        "image_path": f"/static/uploads/{img_filename}",
        "gradcam_path": None,
        "class_name": finding,
        "class_id": CLASS_ID[finding],
        "confidence": CLASS_SCORES[finding][finding],
        "all_scores": CLASS_SCORES[finding],
    }
    if inference:
        try:
            cid, cname, conf, scores, arr = inference.predict_image(img)
            result.update(class_id=cid, class_name=cname, confidence=conf, all_scores=scores)
            cam_filename = f"{uid}_cam.png"
            cam_path = os.path.join(GRADCAM_DIR, cam_filename)
            if inference.generate_gradcam(img, arr, cid, cam_path):
                result["gradcam_path"] = f"/static/gradcam/{cam_filename}"
        except Exception as e:
            print(f"    model failed on {os.path.basename(src_path)}: {e}")
    return result


def seed():
    init_db()
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(GRADCAM_DIR, exist_ok=True)

    db = SessionLocal()
    try:
        if db.query(m.Patient).count() > 0:
            print("Database already seeded; skipping.")
            return

        pool = _sample_pool()
        inference = None
        if pool:
            try:
                from services import inference as inf
                inf.load_model_cached()
                inference = inf
                print("Model loaded — generating real predictions + Grad-CAM.")
            except Exception as e:
                print(f"Model unavailable, using static scores: {e}")
        else:
            print("No sample images found (run scripts/fetch_samples.py). Using placeholders.")

        counters = {c: 0 for c in CLASS_ID}
        now = datetime.utcnow()
        study_seq = 0

        for i, (name, gender, byear, mrn, findings) in enumerate(PATIENTS):
            patient = m.Patient(
                full_name=name,
                gender=gender,
                birth_date=date(byear, (i % 12) + 1, (i % 27) + 1),
                medical_record_no=mrn,
                phone=f"+9989{(700000000 + i*13):09d}"[:13],
                notes="Imported demo record.",
                created_at=now - timedelta(days=45 - i * 2),
            )
            db.add(patient)
            db.flush()

            for j, finding in enumerate(findings):
                data = None
                if pool.get(finding):
                    files = pool[finding]
                    src = files[counters[finding] % len(files)]
                    counters[finding] += 1
                    data = _process_sample(src, finding, inference)

                # Spread studies across ~45 days for a believable activity trend.
                study_seq += 1
                day_offset = (study_seq * 37) % 45
                created = now - timedelta(days=day_offset, hours=(study_seq * 5) % 24)

                study = m.Study(
                    patient_id=patient.id,
                    modality="MRI",
                    body_part="Brain",
                    source_format="dicom" if (i + j) % 4 == 0 else "image",
                    image_path=data["image_path"] if data else None,
                    dicom_metadata={"modality": "MRI", "study_description": "Brain w/wo contrast"}
                    if (i + j) % 4 == 0
                    else None,
                    created_at=created,
                )
                db.add(study)
                db.flush()

                pred = m.Prediction(
                    study_id=study.id,
                    class_name=data["class_name"] if data else finding,
                    class_id=data["class_id"] if data else CLASS_ID[finding],
                    confidence=data["confidence"] if data else CLASS_SCORES[finding][finding],
                    all_scores=data["all_scores"] if data else CLASS_SCORES[finding],
                    gradcam_path=data["gradcam_path"] if data else None,
                    created_at=created,
                )
                db.add(pred)

        db.commit()
        print(f"Seeded {len(PATIENTS)} patients, {study_seq} studies.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
