"""Extract penultimate-layer features for sample MRIs and project to 2D with t-SNE.

Writes backend/data/embedding.json consumed by the Metrics dashboard scatter.
Run after scripts/fetch_samples.py:  python scripts/compute_embedding.py
"""
import os
import sys
import json

import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
SAMPLES_DIR = os.path.join(BASE_DIR, "backend", "data", "samples")
OUT_PATH = os.path.join(BASE_DIR, "backend", "data", "embedding.json")

CLASSES = ["Glioma", "Meningioma", "Notumor", "Pituitary"]


def build_feature_model(model):
    import tensorflow as tf

    # Prefer a named penultimate layer (EfficientNet model uses 'head_dense'
    # before the logits, or 'gap' as the pooled feature vector).
    names = {l.name for l in model.layers}
    for cand in ("head_dense", "gap"):
        if cand in names:
            try:
                return tf.keras.Model(model.inputs, model.get_layer(cand).output)
            except Exception:
                pass

    # Legacy Sequential: rebuild up to the penultimate dense layer.
    dense_layers = [l for l in model.layers if "dense" in l.__class__.__name__.lower()]
    target = dense_layers[-2] if len(dense_layers) >= 2 else dense_layers[-1]
    inp = tf.keras.Input(shape=model.input_shape[1:])
    x = inp
    feat = None
    for layer in model.layers:
        x = layer(x)
        if layer.name == target.name:
            feat = x
    return tf.keras.Model(inp, feat)


def main():
    from PIL import Image
    from services import inference

    model = inference.load_model_cached()
    feat_model = build_feature_model(model)

    feats, labels = [], []
    for cls in CLASSES:
        d = os.path.join(SAMPLES_DIR, cls)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if not fn.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            img = Image.open(os.path.join(d, fn))
            arr = inference.prepare_image(img)
            f = feat_model.predict(arr, verbose=0)[0]
            feats.append(f)
            labels.append(cls)

    if not feats:
        print("No sample images found; run scripts/fetch_samples.py first.")
        return

    X = np.array(feats)
    n = len(X)
    print(f"Extracted {n} feature vectors of dim {X.shape[1]}")

    from sklearn.manifold import TSNE

    perplexity = max(5, min(30, n // 4))
    tsne = TSNE(n_components=2, perplexity=perplexity, init="pca", random_state=42)
    emb = tsne.fit_transform(X)

    # Normalize to a tidy range for the chart.
    emb = (emb - emb.mean(0)) / (emb.std(0) + 1e-8)

    points = [
        {"x": round(float(emb[i, 0]), 3), "y": round(float(emb[i, 1]), 3), "class": labels[i]}
        for i in range(n)
    ]
    with open(OUT_PATH, "w") as fh:
        json.dump({"points": points, "classes": CLASSES, "method": "t-SNE", "n": n}, fh, indent=2)
    print(f"Wrote {OUT_PATH} ({n} points, perplexity={perplexity})")


if __name__ == "__main__":
    main()
