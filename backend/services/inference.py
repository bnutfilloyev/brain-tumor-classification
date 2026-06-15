"""Lightweight ONNX Runtime inference + gradient-free Grad-CAM.

The model is served via ONNX Runtime (no TensorFlow at runtime). Because the
network is EfficientNetB0 -> GlobalAveragePooling -> Dense(256, ReLU) ->
Dense(4), Grad-CAM reduces to an exact, gradient-free linearisation: the
pooled gradient of class c w.r.t. each conv channel equals
    W1 @ (W2[:, c] * relu_mask)
computed from the classifier head weights and the hidden ReLU activation.
"""
import io
import os
import json
import base64
import logging
from functools import lru_cache

import numpy as np
from PIL import Image

logger = logging.getLogger("tumor_detector")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
ONNX_PATH = os.path.join(MODELS_DIR, "tumor-detection.onnx")
WEIGHTS_PATH = os.path.join(MODELS_DIR, "head_weights.npz")
CALIB_PATH = os.path.join(MODELS_DIR, "calibration.json")

CLASS_MAPPINGS = {0: "Glioma", 1: "Meningioma", 2: "Notumor", 3: "Pituitary"}


@lru_cache(maxsize=1)
def _calibration():
    if os.path.exists(CALIB_PATH):
        with open(CALIB_PATH) as f:
            cfg = json.load(f)
        cfg.setdefault("temperature", 1.0)
        cfg.setdefault("img_size", [224, 224])
        cfg.setdefault("channels", 3)
        return cfg
    return {"temperature": 1.0, "img_size": [224, 224], "channels": 3}


def target_size():
    return tuple(_calibration()["img_size"])


@lru_cache(maxsize=1)
def load_model_cached():
    """Return a cached ONNX Runtime session (kept callable-name for compatibility)."""
    import onnxruntime as ort

    if not os.path.exists(ONNX_PATH):
        raise FileNotFoundError(f"ONNX model not found at {ONNX_PATH}")
    logger.info(f"Loading ONNX model from {ONNX_PATH}")
    so = ort.SessionOptions()
    so.intra_op_num_threads = int(os.environ.get("ORT_THREADS", "2"))
    sess = ort.InferenceSession(ONNX_PATH, sess_options=so, providers=["CPUExecutionProvider"])
    return sess


@lru_cache(maxsize=1)
def _head_weights():
    d = np.load(WEIGHTS_PATH)
    return d["W1"], d["W2"]  # (1280,256), (256,4)


def decode_base64_image(img_data: str) -> bytes:
    if "," in img_data:
        img_data = img_data.split(",", 1)[1]
    return base64.b64decode(img_data)


def prepare_image(img: Image.Image):
    h, w = _calibration()["img_size"]
    rgb = img.convert("RGB").resize((w, h))
    arr = np.array(rgb).astype("float32")
    return np.expand_dims(arr, axis=0)  # (1,H,W,3) raw 0-255


def _run(arr):
    """Run the session; return (logits, conv_map(7,7,1280), hidden(256))."""
    sess = load_model_cached()
    outs = sess.run(None, {sess.get_inputs()[0].name: arr.astype(np.float32)})
    logits = conv = hidden = None
    for o in outs:
        s = o.shape
        if o.ndim == 2 and s[1] == 4:
            logits = o[0]
        elif o.ndim == 4:
            conv = o[0]
        elif o.ndim == 2:
            hidden = o[0]
    return logits, conv, hidden


def _softmax(x):
    x = x - np.max(x)
    e = np.exp(x)
    return e / e.sum()


def predict_image(img: Image.Image):
    """Return (class_id, class_name, confidence, all_scores_dict, input_array)."""
    cfg = _calibration()
    arr = prepare_image(img)
    logits, _, _ = _run(arr)
    probs = _softmax(logits / cfg["temperature"])  # temperature-scaled calibration
    class_id = int(np.argmax(probs))
    confidence = float(np.max(probs) * 100)
    all_scores = {CLASS_MAPPINGS[i]: round(float(probs[i]) * 100, 2) for i in range(len(probs))}
    return class_id, CLASS_MAPPINGS[class_id], round(confidence, 2), all_scores, arr


def _jet(v):
    """Vectorised jet colormap: v in [0,1] (H,W) -> (H,W,3) uint8."""
    r = np.clip(1.5 - np.abs(4 * v - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * v - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * v - 1), 0, 1)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


def generate_gradcam(img: Image.Image, input_array, class_id, save_path):
    """Gradient-free Grad-CAM (exact for this GAP+ReLU head). Saves a PNG overlay."""
    try:
        logits, conv, hidden = _run(input_array)
        if conv is None or hidden is None:
            return False
        W1, W2 = _head_weights()
        relu_mask = (hidden > 0).astype(np.float32)            # (256,)
        eff_w = W1 @ (W2[:, class_id] * relu_mask)             # (1280,)
        cam = conv @ eff_w                                     # (7,7)
        cam = np.maximum(cam, 0)
        cam = cam / (cam.max() + 1e-8)

        size = target_size()
        heat = np.array(Image.fromarray(np.uint8(255 * cam)).resize(size, Image.BILINEAR)) / 255.0
        colored = _jet(heat)
        base = np.array(img.convert("RGB").resize(size))
        overlay = np.uint8(0.55 * base + 0.45 * colored)

        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        Image.fromarray(overlay).save(save_path)
        return True
    except Exception as e:
        logger.error(f"Grad-CAM generation failed: {e}", exc_info=True)
        return False


def load_image_from_bytes(content: bytes) -> Image.Image:
    return Image.open(io.BytesIO(content))
