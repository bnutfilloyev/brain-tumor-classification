"""Statistical significance for the model comparison:
 - Bootstrap 95% confidence intervals for each model's accuracy.
 - McNemar's test comparing the deployed model against every other model.

Reads backend/data/model_predictions.json (written by validation.py).
Writes backend/data/significance.json.

Usage:  python scripts/significance.py
"""
import os
import json

import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
PRED_PATH = os.path.join(DATA_DIR, "model_predictions.json")
OUT_PATH = os.path.join(DATA_DIR, "significance.json")

N_BOOT = 5000
SEED = 42


def bootstrap_ci(correct, n_boot=N_BOOT, alpha=0.05):
    """Percentile bootstrap CI for the mean of a 0/1 correctness vector."""
    rng = np.random.default_rng(SEED)
    n = len(correct)
    means = np.empty(n_boot)
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        means[b] = correct[idx].mean()
    lo = float(np.percentile(means, 100 * alpha / 2))
    hi = float(np.percentile(means, 100 * (1 - alpha / 2)))
    return round(float(correct.mean()), 4), round(lo, 4), round(hi, 4)


def mcnemar(a_correct, b_correct):
    """McNemar's test on two paired correctness vectors.
    Returns (b, c, statistic, p_value) where b = A right & B wrong,
    c = A wrong & B right. Uses the exact binomial test (robust for small n)."""
    from scipy.stats import binomtest, chi2

    b = int(np.sum(a_correct & ~b_correct))
    c = int(np.sum(~a_correct & b_correct))
    n = b + c
    if n == 0:
        return b, c, 0.0, 1.0
    # Exact binomial (two-sided) — valid for any discordant count.
    p = binomtest(min(b, c), n, 0.5, alternative="two-sided").pvalue
    # Continuity-corrected chi-square statistic (reported for reference).
    stat = (abs(b - c) - 1) ** 2 / n if n > 0 else 0.0
    return b, c, round(float(stat), 3), float(p)


def main():
    if not os.path.exists(PRED_PATH):
        raise SystemExit("model_predictions.json not found — run scripts/validation.py first.")
    with open(PRED_PATH) as f:
        data = json.load(f)

    labels = np.array(data["labels"])
    models = {k: np.array(v) for k, v in data["models"].items()}

    # Bootstrap CIs
    cis = {}
    for name, pred in models.items():
        acc, lo, hi = bootstrap_ci((pred == labels).astype(int))
        cis[name] = {"accuracy": acc, "ci_low": lo, "ci_high": hi}

    # McNemar: deployed vs each other
    deployed_name = next((n for n in models if "deployed" in n.lower()), None)
    pairwise = []
    if deployed_name:
        a_correct = (models[deployed_name] == labels)
        for name, pred in models.items():
            if name == deployed_name:
                continue
            b_correct = (pred == labels)
            b, c, stat, p = mcnemar(a_correct, b_correct)
            pairwise.append({
                "vs": name,
                "discordant_deployed_only": b,   # deployed right, other wrong
                "discordant_other_only": c,      # deployed wrong, other right
                "chi2": stat,
                "p_value": round(p, 5),
                "significant": bool(p < 0.05),
            })

    result = {
        "n_test": int(len(labels)),
        "n_bootstrap": N_BOOT,
        "deployed": deployed_name,
        "confidence_intervals": cis,
        "mcnemar_vs_deployed": pairwise,
        "alpha": 0.05,
    }
    with open(OUT_PATH, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Test samples: {len(labels)}")
    for n, ci in cis.items():
        print(f"  {n:40s} acc={ci['accuracy']:.3f}  95% CI [{ci['ci_low']:.3f}, {ci['ci_high']:.3f}]")
    print("McNemar vs deployed:")
    for pw in pairwise:
        sig = "significant" if pw["significant"] else "n.s."
        print(f"  vs {pw['vs']:38s} p={pw['p_value']:.4f} ({sig})")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
