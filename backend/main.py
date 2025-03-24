import base64
import io
import os
import logging
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from models import ImageData, Detection, Result, PredictionResponse

from PIL import Image
import numpy as np
from keras.api.models import load_model

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)
logger = logging.getLogger("tumor_detector")

app = FastAPI(title="Brain Tumor Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLASS_MAPPINGS = {0: "Glioma", 1: "Meninigioma", 2: "Notumor", 3: "Pituitary"}

executor = ThreadPoolExecutor(max_workers=4)


@lru_cache(maxsize=1)
def load_model_cached():
    """Load and cache the tumor detection model."""
    base_path = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_path, "models", "tumor-detection.keras")
    logger.info(f"Loading model from {model_path}")

    if not os.path.exists(model_path):
        logger.error(f"Model file not found at {model_path}")
        raise FileNotFoundError(f"Model file not found at {model_path}")

    try:
        model = load_model(model_path)
        model.predict(np.zeros((1, 168, 168, 1)))
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise RuntimeError(f"Failed to load model: {str(e)}")


def decode_image(img_data: str) -> bytes:
    """Decode base64 image data."""
    if "," in img_data:
        img_data = img_data.split(",", 1)[1]
    return base64.b64decode(img_data)


def prepare_image(image_bytes: bytes, target_size=(168, 168)):
    """Process image bytes into model input format."""
    img = Image.open(io.BytesIO(image_bytes)).convert("L")
    img = img.resize(target_size)
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = np.expand_dims(img_array, axis=-1)
    img_array = img_array / 255.0
    return img_array


def process_single_image(model, img_data: str, idx: int) -> Result:
    """Process a single image and return detection result."""
    try:
        image_bytes = decode_image(img_data)
        img_array = prepare_image(image_bytes)

        prediction = model.predict(img_array, verbose=0)
        predicted_class = np.argmax(prediction[0])
        confidence = float(np.max(prediction[0]) * 100)

        detection = Detection(
            classId=int(predicted_class),
            className=CLASS_MAPPINGS[predicted_class],
            confidence=round(confidence, 2),
        )

        return Result(detections=[detection], id=idx + 1)

    except Exception as e:
        logger.error(f"Error processing image {idx+1}: {str(e)}", exc_info=True)
        return Result(
            detections=[
                Detection(classId=-1, className=f"Error: {str(e)}", confidence=0.0)
            ]
        )


@app.post("/predict", response_model=PredictionResponse)
async def predict(data: ImageData, background_tasks: BackgroundTasks):
    if not data.image:
        raise HTTPException(status_code=400, detail="No images provided")

    try:
        model = load_model_cached()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model loading error: {str(e)}")

    logger.info(f"Processing batch of {len(data.image)} images")
    if len(data.image) > 1:
        futures = [
            executor.submit(process_single_image, model, img_data, idx)
            for idx, img_data in enumerate(data.image)
        ]
        results_list = [future.result() for future in futures]
    else:
        results_list = [process_single_image(model, data.image[0], 0)]
    background_tasks.add_task(
        lambda: logger.info(f"Completed processing batch of {len(data.image)} images")
    )
    return PredictionResponse(results=results_list)


@app.get("/healthcheck")
async def healthcheck():
    return {"status": "healthy", "model_loaded": load_model_cached() is not None}


if __name__ == "__main__":
    import uvicorn

    load_model_cached()
    uvicorn.run(app, host="0.0.0.0", port=8000)
