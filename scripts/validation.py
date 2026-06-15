"""Cross-validation and model-comparison (ablation) for the thesis defense.

Produces:
  backend/data/cv_results.json       — 5-fold CV (EfficientNetB0 features), mean +/- std
  backend/data/model_comparison.json — ablation: from-scratch CNN vs frozen
                                        MobileNetV2 / ResNet50V2 vs fine-tuned EfficientNetB0

Usage:  python scripts/validation.py --data /tmp/btmri2
"""
import os
import sys
import json
import time
import argparse

import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
CALIB_PATH = os.path.join(BASE_DIR, "backend", "models", "calibration.json")

IMG_SIZE = (224, 224)
FOLDER_ORDER = ["glioma_tumor", "meningioma_tumor", "no_tumor", "pituitary_tumor"]
CLASSES = ["Glioma", "Meningioma", "Notumor", "Pituitary"]


def load_arrays(tf, directory, size, color):
    ds = tf.keras.utils.image_dataset_from_directory(
        directory, labels="inferred", label_mode="int", class_names=FOLDER_ORDER,
        image_size=size, batch_size=32, shuffle=False, color_mode=color)
    xs, ys = [], []
    for x, y in ds:
        xs.append(x.numpy()); ys.append(y.numpy())
    return np.concatenate(xs), np.concatenate(ys)


def macro_f1(y_true, y_pred):
    from sklearn.metrics import f1_score
    return float(f1_score(y_true, y_pred, average="macro"))


def extract_features(tf, backbone, X, batch=32):
    feats = []
    for i in range(0, len(X), batch):
        feats.append(backbone(X[i:i + batch], training=False).numpy())
    return np.concatenate(feats)


def train_head(tf, Xtr, ytr, Xval, yval, dim, epochs=30):
    head = tf.keras.Sequential([
        tf.keras.layers.Input((dim,)),
        tf.keras.layers.Dense(256, activation="relu"),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(len(CLASSES)),
    ])
    head.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                 loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                 metrics=["accuracy"])
    head.fit(Xtr, ytr, validation_data=(Xval, yval), epochs=epochs, batch_size=64,
             verbose=0, callbacks=[tf.keras.callbacks.EarlyStopping(
                 patience=6, restore_best_weights=True, monitor="val_accuracy")])
    return head


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    args = ap.parse_args()
    import tensorflow as tf
    from sklearn.model_selection import StratifiedKFold

    train_dir = os.path.join(args.data, "Training")
    test_dir = os.path.join(args.data, "Testing")

    os.makedirs(DATA_DIR, exist_ok=True)

    # ---------- Backbones for the ablation (frozen feature extractors) ----------
    backbones = {
        "EfficientNetB0": (tf.keras.applications.EfficientNetB0, IMG_SIZE),
        "MobileNetV2": (tf.keras.applications.MobileNetV2, IMG_SIZE),
        "ResNet50V2": (tf.keras.applications.ResNet50V2, IMG_SIZE),
    }

    Xtr_rgb, ytr = load_arrays(tf, train_dir, IMG_SIZE, "rgb")
    Xte_rgb, yte = load_arrays(tf, test_dir, IMG_SIZE, "rgb")

    comparison = []
    eff_feats_tr = None
    per_sample = {}  # model display-name -> per-sample predictions (for significance tests)

    for name, (ctor, size) in backbones.items():
        print(f"--- {name} (frozen feature extraction) ---")
        bb = ctor(include_top=False, weights="imagenet", input_shape=size + (3,), pooling="avg")
        bb.trainable = False
        t0 = time.time()
        Ftr = extract_features(tf, bb, Xtr_rgb)
        Fte = extract_features(tf, bb, Xte_rgb)
        infer_ms = (time.time() - t0) / (len(Xtr_rgb) + len(Xte_rgb)) * 1000
        head = train_head(tf, Ftr, ytr, Fte, yte, Ftr.shape[1])
        pred = head.predict(Fte, verbose=0).argmax(1)
        acc = float((pred == yte).mean())
        f1 = macro_f1(yte, pred)
        comparison.append({
            "name": f"{name} (frozen)",
            "accuracy": round(acc, 4), "macro_f1": round(f1, 4),
            "params_m": round(bb.count_params() / 1e6, 2),
            "infer_ms": round(infer_ms, 1),
            "strategy": "Transfer (feature extraction)",
        })
        per_sample[f"{name} (frozen)"] = pred.astype(int).tolist()
        if name == "EfficientNetB0":
            eff_feats_tr = (Ftr, ytr)

    # ---------- From-scratch CNN baseline (no transfer learning) ----------
    print("--- Custom CNN (from scratch) ---")
    Xtr_g, _ = load_arrays(tf, train_dir, (128, 128), "grayscale")
    Xte_g, _ = load_arrays(tf, test_dir, (128, 128), "grayscale")
    cnn = tf.keras.Sequential([
        tf.keras.layers.Input((128, 128, 1)),
        tf.keras.layers.Rescaling(1 / 255.0),
        tf.keras.layers.Conv2D(32, 3, activation="relu"), tf.keras.layers.MaxPool2D(),
        tf.keras.layers.Conv2D(64, 3, activation="relu"), tf.keras.layers.MaxPool2D(),
        tf.keras.layers.Conv2D(128, 3, activation="relu"), tf.keras.layers.MaxPool2D(),
        tf.keras.layers.Flatten(), tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dense(len(CLASSES)),
    ])
    cnn.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
                loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
                metrics=["accuracy"])
    t0 = time.time()
    cnn.fit(Xtr_g, ytr, validation_data=(Xte_g, yte), epochs=15, batch_size=32, verbose=0,
            callbacks=[tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_accuracy")])
    pred = cnn.predict(Xte_g, verbose=0).argmax(1)
    comparison.append({
        "name": "Custom CNN (from scratch)",
        "accuracy": round(float((pred == yte).mean()), 4),
        "macro_f1": round(macro_f1(yte, pred), 4),
        "params_m": round(cnn.count_params() / 1e6, 2),
        "infer_ms": round((time.time() - t0) / len(Xtr_g) * 1000, 1),
        "strategy": "From scratch",
    })
    per_sample["Custom CNN (from scratch)"] = pred.astype(int).tolist()

    # ---------- Deployed model (fine-tuned EfficientNetB0) — real per-sample preds ----------
    print("--- Deployed EfficientNetB0 (fine-tuned) ---")
    dep_name = "EfficientNetB0 (fine-tuned, deployed)"
    deployed = {"name": dep_name, "strategy": "Transfer (fine-tuned)",
                "params_m": 5.3, "infer_ms": None, "deployed": True}
    try:
        dep_model = tf.keras.models.load_model(os.path.join(BASE_DIR, "backend", "models", "tumor-detection.keras"))
        dep_pred = dep_model.predict(Xte_rgb, verbose=0).argmax(1)
        deployed["accuracy"] = round(float((dep_pred == yte).mean()), 4)
        deployed["macro_f1"] = round(macro_f1(yte, dep_pred), 4)
        per_sample[dep_name] = dep_pred.astype(int).tolist()
    except Exception as e:
        print(f"  deployed predict failed ({e}); using calibration.json")
        if os.path.exists(CALIB_PATH):
            with open(CALIB_PATH) as f:
                deployed["accuracy"] = json.load(f).get("test_accuracy")
    comparison.append(deployed)

    with open(os.path.join(DATA_DIR, "model_predictions.json"), "w") as f:
        json.dump({"labels": yte.astype(int).tolist(), "models": per_sample}, f)
    print("Wrote model_predictions.json")

    comparison.sort(key=lambda r: r.get("accuracy", 0))
    with open(os.path.join(DATA_DIR, "model_comparison.json"), "w") as f:
        json.dump({"test_samples": int(len(yte)), "models": comparison}, f, indent=2)
    print("Wrote model_comparison.json")

    # ---------- 5-fold cross-validation (EfficientNetB0 features) ----------
    print("--- 5-fold cross-validation ---")
    Ftr, y = eff_feats_tr
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    folds = []
    for k, (tri, vai) in enumerate(skf.split(Ftr, y), 1):
        head = train_head(tf, Ftr[tri], y[tri], Ftr[vai], y[vai], Ftr.shape[1])
        pred = head.predict(Ftr[vai], verbose=0).argmax(1)
        acc = float((pred == y[vai]).mean()); f1 = macro_f1(y[vai], pred)
        folds.append({"fold": k, "accuracy": round(acc, 4), "macro_f1": round(f1, 4)})
        print(f"  fold {k}: acc={acc:.4f} f1={f1:.4f}")

    accs = np.array([f["accuracy"] for f in folds])
    f1s = np.array([f["macro_f1"] for f in folds])
    cv = {
        "model": "EfficientNetB0 (feature extraction)",
        "k": 5, "folds": folds,
        "mean": {"accuracy": round(float(accs.mean()), 4), "macro_f1": round(float(f1s.mean()), 4)},
        "std": {"accuracy": round(float(accs.std()), 4), "macro_f1": round(float(f1s.std()), 4)},
    }
    with open(os.path.join(DATA_DIR, "cv_results.json"), "w") as f:
        json.dump(cv, f, indent=2)
    print(f"CV accuracy: {cv['mean']['accuracy']:.4f} +/- {cv['std']['accuracy']:.4f}")
    print("Wrote cv_results.json")


if __name__ == "__main__":
    main()
