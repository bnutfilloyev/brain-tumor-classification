# NeuroScan — Brain Tumor Classification Platform

A clinical decision-support platform for brain MRI tumor classification, built for a PhD
research project. It detects four classes (**Glioma, Meningioma, Notumor, Pituitary**) from
MRI scans and wraps the model in a full demo platform: patient management, case history,
explainability (Grad-CAM), a Claude-powered clinical assistant, and a rich metrics dashboard.

## Features

- **Modern clinical UI** — minimalist light-mode interface (React + Vite + Tailwind), bilingual
  **English / Uzbek** switcher.
- **Patient management** — full CRUD, medical record numbers, and per-patient **case history**
  (studies + predictions stored in SQLite).
- **Multi-format ingestion** — JPG / PNG **and DICOM (.dcm)** with metadata extraction.
- **Explainability** — Grad-CAM heatmaps showing which regions drove each prediction.
- **AI clinical assistant** — Claude (Haiku) generates educational clinical summaries and answers
  free-form questions about each finding, **streamed token-by-token** (with medical disclaimers).
- **Metrics dashboard** — accuracy, per-class precision/recall/F1 (radar), confusion matrix
  (count/% toggle), ROC & Precision-Recall curves, **calibration/reliability diagram (ECE)**,
  **t-SNE feature embedding**, dataset statistics, and training history.
- **PDF reports** — one-click clinical report per patient (info, case history, MRI + Grad-CAM
  images, AI summaries) for the thesis defense.

## Architecture

```
frontend/  React + Vite + Tailwind + Recharts (SPA, served by nginx in prod)
backend/   FastAPI + Keras/TensorFlow + SQLAlchemy (SQLite) + Anthropic SDK + pydicom
scripts/   compute_metrics.py — evaluation metrics generator
```

Key backend endpoints: `/analyze` (image/DICOM inference + Grad-CAM), `/patients` (CRUD +
`/history`), `/ai/summary` & `/ai/chat` (Claude), `/metrics/*` (performance, dataset, training,
live overview).

## Quick start (local)

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python ../scripts/fetch_samples.py --per-class 30  # real sample MRIs (network; has offline fallback)
python data/seed.py                    # mock patients + history (real predictions + Grad-CAM)
python ../scripts/compute_metrics.py   # metrics JSON: ROC, PR, confusion, calibration (optional --test-dir PATH)
python ../scripts/compute_embedding.py # t-SNE feature embedding for the metrics scatter
uvicorn main:app --reload              # http://localhost:8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                            # http://localhost:3000 (proxies /api -> :8000)
```

## Docker

```bash
cp .env.example .env   # optionally add ANTHROPIC_API_KEY
docker-compose up --build
# Frontend: http://localhost:3000   Backend API: http://localhost:8000
```

## Claude AI configuration

Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, default `claude-fable-5`) to enable
live AI summaries/chat. Without a key, the app falls back to built-in educational text so the
demo runs fully offline.

## Model training & evaluation

The model is **EfficientNetB0** (ImageNet transfer learning, two-phase fine-tuning) on the
4-class brain MRI dataset, with **temperature-scaling calibration** so confidence scores are
trustworthy (no more saturated 100%). Current held-out test results: **~94% accuracy, macro-F1
0.94, per-class ROC-AUC > 0.99, ECE ≈ 1.9%**.

To reproduce training from scratch:

```bash
# 1. Get the dataset (public GitHub mirror)
git clone --depth 1 https://github.com/sartajbhuvaji/brain-tumor-classification-dataset.git /tmp/btmri
# (optional) merge + restratify Training/Testing for a clean split

# 2. Train (EfficientNetB0, ~15-25 min on CPU) -> backend/models/tumor-detection.keras + calibration.json
python scripts/train_model.py --data /tmp/btmri --warmup 4 --finetune 16

# 3. Real metrics from the held-out test set (confusion, ROC, PR, calibration)
python scripts/compute_metrics.py --test-dir /tmp/btmri/Testing

# 4. Feature embedding for the t-SNE scatter
python scripts/compute_embedding.py

# 5. Validation page artifacts: 5-fold CV, model ablation, error gallery
python scripts/validation.py --data /tmp/btmri
python scripts/find_misclassified.py --test-dir /tmp/btmri/Testing
```

The **Validation** page reports 5-fold cross-validation (mean ± std), a model-comparison
ablation (from-scratch CNN vs frozen MobileNetV2/ResNet50V2 vs fine-tuned EfficientNetB0), and
an error-analysis gallery of the model's actual misclassifications.

`compute_metrics.py` falls back to a realistic baseline if no `--test-dir` is given, so the
dashboard always has data.

## Disclaimer

Research and educational use only. Not a certified diagnostic device; not a substitute for
professional radiological assessment.
