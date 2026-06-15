"""Convert the Keras EfficientNetB0 model to ONNX for lightweight, TF-free serving.

Exports a multi-output ONNX graph (logits + top conv feature map + hidden
activation) so Grad-CAM can be computed gradient-free at inference time, and
saves the classifier head weights used by that computation.

Usage:  python scripts/convert_to_onnx.py
"""
import os
import sys

import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "backend", "models")
KERAS_PATH = os.path.join(MODELS_DIR, "tumor-detection.keras")
ONNX_PATH = os.path.join(MODELS_DIR, "tumor-detection.onnx")
WEIGHTS_PATH = os.path.join(MODELS_DIR, "head_weights.npz")


def main():
    import tensorflow as tf
    import tf2onnx

    model = tf.keras.models.load_model(KERAS_PATH)
    multi = tf.keras.Model(
        model.input,
        [
            model.get_layer("head_logits").output,   # (N, 4)
            model.get_layer("top_activation").output, # (N, 7, 7, 1280)
            model.get_layer("head_dense").output,     # (N, 256) post-ReLU
        ],
    )

    spec = (tf.TensorSpec((None, 224, 224, 3), tf.float32, name="input"),)
    print("Converting to ONNX...")
    tf2onnx.convert.from_keras(multi, input_signature=spec, opset=15, output_path=ONNX_PATH)

    W1 = model.get_layer("head_dense").get_weights()[0]    # (1280, 256)
    W2 = model.get_layer("head_logits").get_weights()[0]   # (256, 4)
    np.savez(WEIGHTS_PATH, W1=W1.astype(np.float32), W2=W2.astype(np.float32))

    print(f"Saved {ONNX_PATH} ({os.path.getsize(ONNX_PATH)/1e6:.1f} MB)")
    print(f"Saved head weights {WEIGHTS_PATH}  W1={W1.shape} W2={W2.shape}")

    # ---- sanity check: ONNX vs Keras agreement ----
    import onnxruntime as ort

    sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
    x = np.random.rand(1, 224, 224, 3).astype(np.float32) * 255
    outs = sess.run(None, {sess.get_inputs()[0].name: x})
    by_shape = {tuple(o.shape[1:]): o for o in outs}
    onnx_logits = by_shape[(4,)]
    keras_logits = model.predict(x, verbose=0)
    diff = float(np.abs(onnx_logits - keras_logits).max())
    print(f"Max |ONNX - Keras| logits diff: {diff:.6f}  ({'OK' if diff < 1e-3 else 'MISMATCH'})")
    print("ONNX output shapes:", [o.shape for o in outs])


if __name__ == "__main__":
    main()
