"""DICOM handling: read .dcm files into a PIL grayscale image and extract metadata."""
import io
from typing import Tuple, Dict, Any

import numpy as np
from PIL import Image


def is_dicom(filename: str, content: bytes) -> bool:
    if filename and filename.lower().endswith((".dcm", ".dicom")):
        return True
    # DICOM files contain the magic "DICM" at byte offset 128
    return len(content) > 132 and content[128:132] == b"DICM"


def read_dicom(content: bytes) -> Tuple[Image.Image, Dict[str, Any]]:
    """Return (PIL grayscale image, metadata dict) from raw DICOM bytes."""
    import pydicom

    ds = pydicom.dcmread(io.BytesIO(content), force=True)
    arr = ds.pixel_array.astype(np.float32)

    # Apply rescale slope/intercept if present
    slope = float(getattr(ds, "RescaleSlope", 1) or 1)
    intercept = float(getattr(ds, "RescaleIntercept", 0) or 0)
    arr = arr * slope + intercept

    # Normalize to 0-255
    arr_min, arr_max = arr.min(), arr.max()
    if arr_max > arr_min:
        arr = (arr - arr_min) / (arr_max - arr_min) * 255.0
    arr = arr.astype(np.uint8)

    if arr.ndim == 3:
        arr = arr[..., 0]
    img = Image.fromarray(arr).convert("L")

    def g(attr, default=None):
        val = getattr(ds, attr, default)
        return str(val) if val is not None else default

    metadata = {
        "patient_name": g("PatientName"),
        "patient_id": g("PatientID"),
        "patient_birth_date": g("PatientBirthDate"),
        "patient_sex": g("PatientSex"),
        "study_date": g("StudyDate"),
        "modality": g("Modality"),
        "body_part": g("BodyPartExamined"),
        "manufacturer": g("Manufacturer"),
        "study_description": g("StudyDescription"),
        "rows": getattr(ds, "Rows", None),
        "columns": getattr(ds, "Columns", None),
    }
    metadata = {k: v for k, v in metadata.items() if v is not None}
    return img, metadata
