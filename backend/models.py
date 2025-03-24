from pydantic import BaseModel, Field
from typing import List


class ImageData(BaseModel):
    image: List[str] = Field(..., description="List of base64 encoded images")


class Detection(BaseModel):
    classId: int
    className: str
    confidence: float


class Result(BaseModel):
    detections: List[Detection]


class PredictionResponse(BaseModel):
    results: List[Result]
