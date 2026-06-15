"""Download a handful of real brain-MRI sample images per class for the demo.

Source: public GitHub mirror of the Brain Tumor Classification dataset
(sartajbhuvaji/brain-tumor-classification-dataset). Falls back to augmenting the
bundled keras-test/local_image.jpg if the network is unavailable, so seeding
always has images to work with.

Usage:  python scripts/fetch_samples.py [--per-class 5]
"""
import os
import io
import sys
import json
import argparse
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES_DIR = os.path.join(BASE_DIR, "backend", "data", "samples")

# Map our model classes -> dataset folder names
REPO = "sartajbhuvaji/brain-tumor-classification-dataset"
CLASS_FOLDERS = {
    "Glioma": "glioma_tumor",
    "Meningioma": "meningioma_tumor",
    "Notumor": "no_tumor",
    "Pituitary": "pituitary_tumor",
}
FALLBACK_IMG = os.path.join(BASE_DIR, "keras-test", "local_image.jpg")


def _get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": "neuroscan-fetch"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def fetch_from_github(per_class):
    ok = 0
    for cls, folder in CLASS_FOLDERS.items():
        out_dir = os.path.join(SAMPLES_DIR, cls)
        os.makedirs(out_dir, exist_ok=True)
        try:
            listing = json.loads(
                _get(f"https://api.github.com/repos/{REPO}/contents/Testing/{folder}")
            )
            files = [f for f in listing if f["name"].lower().endswith((".jpg", ".jpeg", ".png"))]
            # spread the picks across the folder for visual variety
            step = max(1, len(files) // per_class)
            picks = files[::step][:per_class]
            for i, f in enumerate(picks):
                data = _get(f["download_url"])
                with open(os.path.join(out_dir, f"{cls.lower()}_{i+1}.jpg"), "wb") as fh:
                    fh.write(data)
                ok += 1
            print(f"  {cls}: downloaded {len(picks)}")
        except Exception as e:
            print(f"  {cls}: download failed ({e})")
    return ok


def fallback_augment(per_class):
    from PIL import Image, ImageEnhance

    if not os.path.exists(FALLBACK_IMG):
        print("No fallback image available; skipping.")
        return 0
    base = Image.open(FALLBACK_IMG).convert("L")
    ops = [
        lambda im: im,
        lambda im: im.transpose(Image.FLIP_LEFT_RIGHT),
        lambda im: im.rotate(8),
        lambda im: im.rotate(-8),
        lambda im: ImageEnhance.Brightness(im).enhance(1.15),
        lambda im: ImageEnhance.Contrast(im).enhance(1.2),
    ]
    ok = 0
    for cls in CLASS_FOLDERS:
        out_dir = os.path.join(SAMPLES_DIR, cls)
        os.makedirs(out_dir, exist_ok=True)
        for i in range(per_class):
            img = ops[i % len(ops)](base)
            img.save(os.path.join(out_dir, f"{cls.lower()}_{i+1}.jpg"))
            ok += 1
    print(f"  Generated {ok} augmented fallback images.")
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=5)
    args = ap.parse_args()

    os.makedirs(SAMPLES_DIR, exist_ok=True)
    print(f"Fetching ~{args.per_class} samples per class -> {SAMPLES_DIR}")
    ok = fetch_from_github(args.per_class)
    if ok == 0:
        print("Network fetch produced nothing; using augmentation fallback.")
        fallback_augment(args.per_class)
    print("Done.")


if __name__ == "__main__":
    main()
