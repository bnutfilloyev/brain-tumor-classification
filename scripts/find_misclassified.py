"""Find test-set images the DEPLOYED model misclassifies, for the error-analysis
gallery. Saves thumbnails to backend/data/misclassified/ and a JSON manifest.

Usage:  python scripts/find_misclassified.py --test-dir /tmp/btmri2/Testing --limit 24
"""
import os
import sys
import json
import shutil
import argparse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
OUT_DIR = os.path.join(DATA_DIR, "misclassified")

FOLDER_MAP = {
    "Glioma": "glioma_tumor", "Meningioma": "meningioma_tumor",
    "Notumor": "no_tumor", "Pituitary": "pituitary_tumor",
}
CLASSES = list(FOLDER_MAP.keys())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test-dir", required=True)
    ap.add_argument("--limit", type=int, default=24)
    args = ap.parse_args()

    sys.path.insert(0, os.path.join(BASE_DIR, "backend"))
    from PIL import Image
    from services import inference

    inference.load_model_cached()
    if os.path.isdir(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR, exist_ok=True)

    items, total, wrong = [], 0, 0
    for true_cls in CLASSES:
        folder = os.path.join(args.test_dir, FOLDER_MAP[true_cls])
        if not os.path.isdir(folder):
            continue
        for fn in sorted(os.listdir(folder)):
            if not fn.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            total += 1
            img = Image.open(os.path.join(folder, fn))
            cid, cname, conf, scores, _ = inference.predict_image(img)
            if cname != true_cls:
                wrong += 1
                out_name = f"{true_cls}_{wrong}.png"
                img.convert("L").resize((180, 180)).save(os.path.join(OUT_DIR, out_name))
                items.append({
                    "image": f"/static/misclassified/{out_name}",
                    "true": true_cls,
                    "predicted": cname,
                    "confidence": conf,
                    "scores": scores,
                })

    items.sort(key=lambda x: -x["confidence"])  # most confident mistakes first
    manifest = {
        "total_test": total,
        "misclassified": wrong,
        "error_rate": round(wrong / total, 4) if total else 0,
        "items": items[: args.limit],
        "shown": min(len(items), args.limit),
    }
    with open(os.path.join(DATA_DIR, "misclassified.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"{wrong}/{total} misclassified ({manifest['error_rate']*100:.1f}%). "
          f"Saved {manifest['shown']} to gallery.")


if __name__ == "__main__":
    main()
