"""Train an EfficientNetB0 transfer-learning classifier on the full 4-class
brain-tumor MRI dataset, with two-phase fine-tuning and temperature-scaling
calibration.

Phase 1: freeze the ImageNet backbone, train the classifier head.
Phase 2: unfreeze the top backbone blocks and fine-tune at a low learning rate.
Then fit a temperature on the validation set and save logits-output model.

Usage:
  python scripts/train_model.py --data /tmp/btmri --warmup 4 --finetune 14
"""
import os
import json
import argparse

import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "backend", "models", "tumor-detection.keras")
CALIB_PATH = os.path.join(BASE_DIR, "backend", "models", "calibration.json")

IMG_SIZE = (224, 224)
FOLDER_ORDER = ["glioma_tumor", "meningioma_tumor", "no_tumor", "pituitary_tumor"]
CLASSES = ["Glioma", "Meningioma", "Notumor", "Pituitary"]


def fit_temperature(tf, logits, labels, steps=500, lr=0.01):
    logits = tf.constant(logits, dtype=tf.float32)
    labels = tf.constant(labels, dtype=tf.int32)
    log_T = tf.Variable(0.0)
    opt = tf.keras.optimizers.Adam(lr)
    loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)
    for _ in range(steps):
        with tf.GradientTape() as tape:
            loss = loss_fn(labels, logits / tf.exp(log_T))
        grads = tape.gradient(loss, [log_T])
        opt.apply_gradients(zip(grads, [log_T]))
    return float(tf.exp(log_T).numpy())


def ece(probs, labels, n_bins=15):
    conf = probs.max(1); pred = probs.argmax(1)
    acc = (pred == labels).astype(float)
    e, n = 0.0, len(labels)
    for i in range(n_bins):
        lo, hi = i / n_bins, (i + 1) / n_bins
        m = (conf > lo) & (conf <= hi)
        if m.sum():
            e += (m.sum() / n) * abs(acc[m].mean() - conf[m].mean())
    return float(e)


def softmax(x):
    x = x - x.max(1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(1, keepdims=True)


def logits_and_labels(model, ds):
    lg, lb = [], []
    for x, y in ds:
        lg.append(model.predict(x, verbose=0))
        lb.append(y.numpy())
    return np.concatenate(lg), np.concatenate(lb)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--warmup", type=int, default=4)
    ap.add_argument("--finetune", type=int, default=14)
    args = ap.parse_args()

    import tensorflow as tf

    train_dir = os.path.join(args.data, "Training")
    test_dir = os.path.join(args.data, "Testing")
    common = dict(labels="inferred", label_mode="int", class_names=FOLDER_ORDER,
                  image_size=IMG_SIZE, batch_size=32)

    train_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir, validation_split=0.15, subset="training", seed=42, **common)
    val_ds = tf.keras.utils.image_dataset_from_directory(
        train_dir, validation_split=0.15, subset="validation", seed=42, **common)
    test_ds = tf.keras.utils.image_dataset_from_directory(
        test_dir, shuffle=False, **common)

    # class weights (no_tumor is under-represented)
    y_all = np.concatenate([y.numpy() for _, y in train_ds])
    cw = {i: float(len(y_all) / (len(CLASSES) * max(1, (y_all == i).sum()))) for i in range(len(CLASSES))}

    AUTOTUNE = tf.data.AUTOTUNE
    aug = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomContrast(0.1),
    ], name="augment")
    train_ds = train_ds.map(lambda x, y: (aug(x, training=True), y), num_parallel_calls=AUTOTUNE).prefetch(AUTOTUNE)
    val_ds = val_ds.cache().prefetch(AUTOTUNE)

    inp = tf.keras.layers.Input(IMG_SIZE + (3,))
    backbone = tf.keras.applications.EfficientNetB0(include_top=False, weights="imagenet", input_tensor=inp)
    backbone.trainable = False
    x = tf.keras.layers.GlobalAveragePooling2D(name="gap")(backbone.output)
    x = tf.keras.layers.Dropout(0.3)(x)
    x = tf.keras.layers.Dense(256, activation="relu", name="head_dense")(x)
    x = tf.keras.layers.Dropout(0.4)(x)
    out = tf.keras.layers.Dense(len(CLASSES), name="head_logits")(x)
    model = tf.keras.Model(inp, out, name="neuroscan_efficientnet")

    loss = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)

    # Phase 1 — train head only.
    print("=== Phase 1: head warmup ===")
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss=loss, metrics=["accuracy"])
    model.fit(train_ds, validation_data=val_ds, epochs=args.warmup, class_weight=cw, verbose=2)

    # Phase 2 — unfreeze top of backbone and fine-tune.
    print("=== Phase 2: fine-tune top backbone ===")
    backbone.trainable = True
    # Freeze the lower layers; fine-tune roughly the top third.
    cut = int(len(backbone.layers) * 0.66)
    for layer in backbone.layers[:cut]:
        layer.trainable = False
    for layer in backbone.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-4), loss=loss, metrics=["accuracy"])
    model.fit(
        train_ds, validation_data=val_ds, epochs=args.finetune, class_weight=cw, verbose=2,
        callbacks=[
            tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_accuracy"),
            tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
        ],
    )

    # Evaluate on the real test set.
    test_logits, yte = logits_and_labels(model, test_ds)
    test_acc = float((test_logits.argmax(1) == yte).mean())
    print(f"\nTest accuracy: {test_acc:.4f}")

    val_logits, yval = logits_and_labels(model, val_ds)
    T = fit_temperature(tf, val_logits, yval)
    ece_b = ece(softmax(test_logits), yte)
    ece_a = ece(softmax(test_logits / T), yte)
    print(f"Temperature T={T:.3f} | ECE {ece_b:.4f} -> {ece_a:.4f}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    model.save(MODEL_PATH)
    with open(CALIB_PATH, "w") as f:
        json.dump({
            "temperature": round(T, 4),
            "ece_before": round(ece_b, 4),
            "ece_after": round(ece_a, 4),
            "test_accuracy": round(test_acc, 4),
            "outputs_logits": True,
            "img_size": list(IMG_SIZE),
            "channels": 3,
            "classes": CLASSES,
        }, f, indent=2)
    print(f"Saved model -> {MODEL_PATH}")


if __name__ == "__main__":
    main()
