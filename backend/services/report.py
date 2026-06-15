"""Generate a clinical PDF report for a patient using reportlab."""
import os
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

BRAND = colors.HexColor("#137f84")
MUTED = colors.HexColor("#64748b")


def _abs(path):
    """Map a /static/... URL to an absolute file path on disk."""
    if not path:
        return None
    rel = path.replace("/static/", "")
    p = os.path.join(DATA_DIR, rel)
    return p if os.path.exists(p) else None


def build_patient_report(patient, studies):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], textColor=BRAND, fontSize=20, spaceAfter=2)
    sub = ParagraphStyle("sub", parent=styles["Normal"], textColor=MUTED, fontSize=9)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#1e293b"), fontSize=13)
    body = ParagraphStyle("body", parent=styles["Normal"], fontSize=9.5, leading=13)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=MUTED)

    el = []
    el.append(Paragraph("NeuroScan — Clinical Report", h1))
    el.append(Paragraph(f"Brain MRI Tumor Classification · Generated {datetime.utcnow():%Y-%m-%d %H:%M} UTC", sub))
    el.append(Spacer(1, 6))
    el.append(HRFlowable(width="100%", color=colors.HexColor("#e2e8f0")))
    el.append(Spacer(1, 10))

    # Patient info
    el.append(Paragraph("Patient", h2))
    info = [
        ["Full name", patient.full_name or "—", "MRN", patient.medical_record_no or "—"],
        ["Gender", (patient.gender or "—").title(), "Date of birth", str(patient.birth_date or "—")],
        ["Phone", patient.phone or "—", "Studies", str(len(studies))],
    ]
    tbl = Table(info, colWidths=[28 * mm, 55 * mm, 28 * mm, 51 * mm])
    tbl.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    el.append(tbl)
    el.append(Spacer(1, 12))

    # Studies
    el.append(Paragraph("Case History", h2))
    el.append(Spacer(1, 4))

    if not studies:
        el.append(Paragraph("No studies recorded.", small))

    for idx, study in enumerate(sorted(studies, key=lambda s: s.created_at or datetime.min, reverse=True), 1):
        pred = study.prediction
        date_str = f"{study.created_at:%Y-%m-%d}" if study.created_at else "—"
        title = f"Study #{idx} — {study.modality} {study.body_part} · {date_str} · {study.source_format.upper()}"
        el.append(Paragraph(title, ParagraphStyle("st", parent=body, fontSize=10.5, textColor=BRAND, spaceBefore=6)))

        if pred:
            el.append(Paragraph(
                f"<b>Finding:</b> {pred.class_name} &nbsp;&nbsp; <b>Confidence:</b> {pred.confidence:.1f}%", body))
            if pred.all_scores:
                scores = " · ".join(f"{k}: {v}%" for k, v in pred.all_scores.items())
                el.append(Paragraph(f"<font color='#64748b'>{scores}</font>", small))

        # Images: original + grad-cam side by side
        img_cells = []
        orig = _abs(study.image_path)
        cam = _abs(pred.gradcam_path) if pred else None
        if orig:
            img_cells.append(_img_block(orig, "Original MRI"))
        if cam:
            img_cells.append(_img_block(cam, "Grad-CAM"))
        if img_cells:
            it = Table([img_cells], hAlign="LEFT")
            it.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 8)]))
            el.append(Spacer(1, 4))
            el.append(it)

        if pred and pred.ai_summary:
            txt = pred.ai_summary.replace("\n", "<br/>").replace("**", "")
            el.append(Spacer(1, 3))
            el.append(Paragraph(f"<b>AI summary:</b> {txt[:900]}", small))

        el.append(Spacer(1, 6))
        el.append(HRFlowable(width="100%", color=colors.HexColor("#eef2f6")))

    el.append(Spacer(1, 10))
    el.append(Paragraph(
        "Research and educational use only. Not a certified diagnostic device; "
        "not a substitute for professional radiological assessment.", small))

    doc.build(el)
    buf.seek(0)
    return buf


def _img_block(path, caption):
    from reportlab.platypus import Table as T
    try:
        img = Image(path, width=42 * mm, height=42 * mm)
    except Exception:
        return Paragraph(caption, ParagraphStyle("c", fontSize=8))
    cap = Paragraph(f"<font color='#94a3b8' size=7>{caption}</font>", ParagraphStyle("c", fontSize=7))
    inner = T([[img], [cap]])
    inner.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("TOPPADDING", (0, 1), (0, 1), 2)]))
    return inner
