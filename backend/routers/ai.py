from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models_db as m
import schemas as s
from services import claude_client

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/summary/stream")
def summary_stream(req: s.AISummaryRequest):
    gen = claude_client.stream_summary(
        req.class_name, req.confidence, req.language, req.patient_context
    )
    return StreamingResponse(gen, media_type="text/plain; charset=utf-8")


@router.post("/chat/stream")
def chat_stream(req: s.AIChatRequest):
    gen = claude_client.stream_chat(
        req.messages, req.class_name, req.confidence, req.language
    )
    return StreamingResponse(gen, media_type="text/plain; charset=utf-8")


@router.post("/summary", response_model=s.AISummaryResponse)
def summary(req: s.AISummaryRequest, db: Session = Depends(get_db)):
    text, model, fallback = claude_client.generate_summary(
        req.class_name, req.confidence, req.language, req.patient_context
    )
    return s.AISummaryResponse(summary=text, model=model, fallback=fallback)


@router.post("/chat", response_model=s.AIChatResponse)
def chat(req: s.AIChatRequest):
    reply, model, fallback = claude_client.chat(
        req.messages, req.class_name, req.confidence, req.language
    )
    return s.AIChatResponse(reply=reply, model=model, fallback=fallback)


@router.post("/summary/study/{study_id}", response_model=s.AISummaryResponse)
def summary_for_study(study_id: int, language: str = "en", db: Session = Depends(get_db)):
    study = db.query(m.Study).filter(m.Study.id == study_id).first()
    pred = study.prediction if study else None
    if not pred:
        return s.AISummaryResponse(summary="No prediction found.", model="", fallback=True)
    ctx = None
    if study.patient:
        ctx = f"{study.patient.full_name}, gender {study.patient.gender}"
    text, model, fallback = claude_client.generate_summary(
        pred.class_name, pred.confidence, language, ctx
    )
    pred.ai_summary = text
    db.commit()
    return s.AISummaryResponse(summary=text, model=model, fallback=fallback)
